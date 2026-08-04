import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { applicationAreas } from "@hr-copilot/shared";
import { buildApplicationPreviewPrompt } from "../../ai/prompts";
import { applicationPreviewExtractionSchema } from "../../../schemas/ai";
import type { ApplicationPreviewExtraction } from "../../../models/ai";

const MAX_PREVIEW_CV_CHARACTERS = 20_000;
const DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_GEMINI_TIMEOUT_MS = 20_000;

@Injectable()
export class ApplicationCvPreviewAiService {
  private readonly logger = new Logger(ApplicationCvPreviewAiService.name);

  constructor(private readonly configService: ConfigService) {}

  get enabled() {
    return (this.configService.get<string>("PREVIEW_AI_PROVIDER") ?? "disabled") === "gemini";
  }

  async extract(input: {
    cvText: string;
    fileName: string;
    allowedApplicationAreas: string[];
  }): Promise<ApplicationPreviewExtraction | null> {
    if (!this.enabled) return null;

    const apiKey = this.configService.get<string>("GEMINI_API_KEY");
    if (!apiKey) {
      this.logger.warn("Gemini preview extraction skipped: missing GEMINI_API_KEY");
      return null;
    }

    const allowedApplicationAreas = input.allowedApplicationAreas.filter(area =>
      applicationAreas.includes(area as (typeof applicationAreas)[number]),
    );
    const prompt = buildApplicationPreviewPrompt({
      cvText: input.cvText.slice(0, MAX_PREVIEW_CV_CHARACTERS),
      fileName: input.fileName,
      allowedApplicationAreas,
    });
    const model = this.configService.get<string>("GEMINI_MODEL") ?? DEFAULT_GEMINI_MODEL;
    const timeoutMs = this.configService.get<number>("GEMINI_TIMEOUT_MS") ?? DEFAULT_GEMINI_TIMEOUT_MS;
    const startedAt = Date.now();

    try {
      const rawContent = await this.createCompletion({
        apiKey,
        model,
        prompt,
        timeoutMs,
      });
      const parsed = parsePreviewResponse(rawContent);

      this.logger.log(
        `Gemini preview extraction completed: model=${model} elapsedMs=${Date.now() - startedAt}`,
      );

      return {
        ...parsed,
        applicationArea: parsed.applicationArea && allowedApplicationAreas.includes(parsed.applicationArea)
          ? parsed.applicationArea
          : null,
        confidence: {
          ...parsed.confidence,
          applicationArea: parsed.applicationArea && allowedApplicationAreas.includes(parsed.applicationArea)
            ? parsed.confidence.applicationArea
            : 0,
        },
      };
    } catch (error) {
      this.logger.warn(
        `Gemini preview extraction failed: model=${model} elapsedMs=${Date.now() - startedAt} error=${toSafeLogMessage(error)}`,
      );
      return null;
    }
  }

  private async createCompletion(input: {
    apiKey: string;
    model: string;
    prompt: string;
    timeoutMs: number;
  }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
    const baseUrl = (this.configService.get<string>("GEMINI_BASE_URL") ?? DEFAULT_GEMINI_BASE_URL).replace(/\/$/, "");
    const endpoint = `${baseUrl}/models/${encodeURIComponent(input.model)}:generateContent?key=${encodeURIComponent(input.apiKey)}`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "Bạn là trợ lý tuyển dụng. Chỉ trả về JSON hợp lệ theo schema được yêu cầu.",
            }],
          },
          contents: [{
            role: "user",
            parts: [{ text: input.prompt }],
          }],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Gemini request failed with status ${response.status}`);
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

function parsePreviewResponse(raw: string): ApplicationPreviewExtraction {
  const stripped = stripJsonCodeFence(raw.trim());
  const extracted = extractFirstJsonObject(stripped) ?? stripped;
  const parsed = JSON.parse(extracted) as unknown;
  return applicationPreviewExtractionSchema.parse(parsed);
}

function stripJsonCodeFence(value: string) {
  if (!value.startsWith("```")) return value;
  return value
    .replace(/^```(?:json)?\s*/iu, "")
    .replace(/\s*```$/u, "")
    .trim();
}

function extractFirstJsonObject(value: string) {
  const start = value.indexOf("{");
  if (start < 0) return undefined;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < value.length; index += 1) {
    const character = value[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) return value.slice(start, index + 1).trim();
    }
  }

  return undefined;
}

function toSafeLogMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "unknown error";
}
