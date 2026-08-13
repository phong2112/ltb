import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_MODEL_CHAIN = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3-flash",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
];
const DEFAULT_GEMINI_TIMEOUT_MS = 20_000;
const DEFAULT_GEMINI_QUOTA_COOLDOWN_MS = 60_000;

export type GeminiGenerateInput = {
  apiKey: string;
  prompt: string;
  systemInstruction: string;
  timeoutMs?: number;
};

export type GeminiGenerateResult = {
  content: string;
  model: string;
};

@Injectable()
export class GeminiProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly modelCooldowns = new Map<string, number>();

  constructor(private readonly configService: ConfigService) {}

  async generateJson(input: GeminiGenerateInput): Promise<GeminiGenerateResult> {
    const startedAt = Date.now();
    const modelChain = this.getModelChain();
    const availableModels = this.getAvailableModels(modelChain);
    const modelsToTry = availableModels.length ? availableModels : modelChain;
    let lastError: unknown;

    for (const model of modelsToTry) {
      try {
        const content = await this.createCompletion({
          ...input,
          model,
          timeoutMs: input.timeoutMs ?? this.getTimeoutMs(),
        });

        this.logger.log(`Gemini request completed: model=${model} elapsedMs=${Date.now() - startedAt}`);
        return { content, model };
      } catch (error) {
        lastError = error;

        if (!isFallbackError(error)) {
          throw error;
        }

        if (error instanceof GeminiApiError && error.status === 429) {
          this.cooldownModel(model, error.retryAfterMs);
        }

        this.logger.warn(
          `Gemini model fallback: model=${model} elapsedMs=${Date.now() - startedAt} error=${toSafeLogMessage(error)}`,
        );
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Gemini request failed for every configured model");
  }

  private async createCompletion(input: GeminiGenerateInput & {
    model: string;
    timeoutMs: number;
  }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
    const endpoint = this.buildEndpoint(input.model, input.apiKey);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: input.systemInstruction }],
          },
          contents: [{
            role: "user",
            parts: [{ text: input.prompt }],
          }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new GeminiApiError(
          response.status,
          `Gemini request failed with status ${response.status}`,
          getRetryAfterMs(response),
        );
      }

      const body = await response.json() as GeminiGenerateContentResponse;
      return body.candidates?.[0]?.content?.parts
        ?.map(part => part.text ?? "")
        .join("")
        .trim() ?? "";
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildEndpoint(model: string, apiKey: string) {
    const baseUrl = (this.configService.get<string>("GEMINI_BASE_URL") ?? DEFAULT_GEMINI_BASE_URL).replace(/\/$/, "");
    return `${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  }

  private getModelChain() {
    const configuredChain = parseModelChain(this.configService.get<string>("GEMINI_MODEL_CHAIN"));
    if (configuredChain.length) return configuredChain;

    const legacyModel = this.configService.get<string>("GEMINI_MODEL")?.trim();
    if (legacyModel) return [legacyModel];

    return DEFAULT_GEMINI_MODEL_CHAIN;
  }

  private getAvailableModels(modelChain: string[]) {
    const now = Date.now();
    return modelChain.filter(model => (this.modelCooldowns.get(model) ?? 0) <= now);
  }

  private cooldownModel(model: string, retryAfterMs?: number) {
    const cooldownMs = retryAfterMs ?? this.configService.get<number>("GEMINI_QUOTA_COOLDOWN_MS") ?? DEFAULT_GEMINI_QUOTA_COOLDOWN_MS;
    this.modelCooldowns.set(model, Date.now() + cooldownMs);
  }

  private getTimeoutMs() {
    return this.configService.get<number>("GEMINI_TIMEOUT_MS") ?? DEFAULT_GEMINI_TIMEOUT_MS;
  }
}

class GeminiApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly retryAfterMs?: number,
  ) {
    super(message);
  }
}

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

function parseModelChain(value: string | undefined) {
  const seen = new Set<string>();
  return (value ?? "")
    .split(",")
    .map(model => model.trim())
    .filter((model) => {
      if (!model || seen.has(model)) return false;
      seen.add(model);
      return true;
    });
}

function isFallbackError(error: unknown) {
  if (error instanceof GeminiApiError) {
    return error.status === 429 || error.status === 500 || error.status === 502 || error.status === 503 || error.status === 504;
  }

  return error instanceof Error && error.name === "AbortError";
}

function getRetryAfterMs(response: Response) {
  const retryAfter = response.headers.get("retry-after");
  if (!retryAfter) return undefined;

  const retryAfterSeconds = Number(retryAfter);
  if (Number.isFinite(retryAfterSeconds)) return Math.max(0, retryAfterSeconds * 1000);

  const retryAt = Date.parse(retryAfter);
  if (!Number.isNaN(retryAt)) return Math.max(0, retryAt - Date.now());

  return undefined;
}

function toSafeLogMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "unknown error";
}
