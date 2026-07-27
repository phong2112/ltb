import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Ollama } from "ollama";
import { z } from "zod";
import { buildExtractProfilePrompt, buildMatchPrompt } from "./ai.prompt";
import type { AiProvider, AnalyzeMatchInput, ExtractProfileInput, ExtractedProfile, ProviderMatchAnalysis } from "./ai.types";

const MAX_PROFILE_CV_CHARACTERS = 45_000;

const extractedProfileSchema = z.object({
  fullName: z.string().nullable(),
  title: z.string().nullable(),
  totalYearsExperience: z.number().min(0).max(60).nullable(),
  skills: z.array(z.string()).max(30),
  languages: z.array(z.string()).max(10),
});

const matchAnalysisSchema = z.object({
  profile: z.object({
    currentRole: z.string().nullable(),
    totalYearsExperience: z.number().min(0).max(60).nullable(),
    skills: z.array(z.string()).max(30),
    languages: z.array(z.string()).max(10),
  }),
  summary: z.string().min(1).max(1200),
  evaluations: z.array(z.object({
    criterionId: z.string(),
    status: z.enum(["met", "partial", "not_met", "unknown"]),
    evidence: z.array(z.string()).max(3),
    reason: z.string().min(1).max(500),
  })).max(20),
  strengths: z.array(z.string()).max(6),
  risks: z.array(z.string()).max(6),
  screeningQuestions: z.array(z.string()).max(6),
});

@Injectable()
export class OllamaAiProvider implements AiProvider {
  readonly name = "ollama";
  readonly model: string;
  private readonly logger = new Logger(OllamaAiProvider.name);
  private readonly client: Ollama;
  private readonly contextLength: number;
  private readonly timeoutMs: number;

  constructor(configService: ConfigService) {
    const host = configService.get<string>("OLLAMA_BASE_URL") ?? "http://localhost:11434";
    this.timeoutMs = getPositiveIntegerConfig(configService, "OLLAMA_TIMEOUT_MS", 300_000);

    this.model = configService.get<string>("OLLAMA_MODEL") ?? "qwen3:4b";
    this.contextLength = getPositiveIntegerConfig(configService, "OLLAMA_CONTEXT_LENGTH", 16_384);
    this.client = new Ollama({ host, fetch: createTimeoutFetch(this.timeoutMs) });
    this.logger.log(`Ollama provider configured: model=${this.model} timeoutMs=${this.timeoutMs} contextLength=${this.contextLength}`);
  }

  async analyzeMatch(input: AnalyzeMatchInput): Promise<ProviderMatchAnalysis> {
    const prompt = buildMatchPrompt(input);
    const startedAt = Date.now();
    const baseMessages = [
      {
        role: "system" as const,
        content: "Bạn là trợ lý tuyển dụng. Kết quả chỉ hỗ trợ HR ra quyết định và phải dựa trên bằng chứng trong CV.",
      },
      {
        role: "user" as const,
        content: prompt,
      },
    ];

    this.logger.log(
      [
        "Ollama match request started:",
        `model=${this.model}`,
        `criteria=${input.criteria.length}`,
        `cvChars=${input.cvText.length}`,
        `jobDescriptionChars=${input.jobDescription.length}`,
        `promptChars=${prompt.length}`,
        `timeoutMs=${this.timeoutMs}`,
        `contextLength=${this.contextLength}`,
      ].join(" "),
    );

    try {
      let response = await this.client.chat({
        model: this.model,
        stream: false,
        think: false,
        keep_alive: "10m",
        format: z.toJSONSchema(matchAnalysisSchema),
        options: {
          temperature: 0,
          num_ctx: this.contextLength,
        },
        messages: baseMessages,
      });
      let rawContent = response.message.content;
      let analysis: ProviderMatchAnalysis;

      try {
        analysis = parseStructuredResponse(rawContent, matchAnalysisSchema);
      } catch (error) {
        if (!(error instanceof StructuredResponseError)) throw error;

        this.logger.warn(`Ollama structured response requires repair: ${error.message}`);
        response = await this.client.chat({
          model: this.model,
          stream: false,
          think: false,
          keep_alive: "10m",
          format: z.toJSONSchema(matchAnalysisSchema),
          options: {
            temperature: 0,
            num_ctx: this.contextLength,
          },
          messages: [
            ...baseMessages,
            { role: "assistant", content: rawContent },
            {
              role: "user",
              content: `JSON vừa trả về không đúng schema (${error.message}). Hãy sửa và chỉ trả về một JSON object hợp lệ, không có markdown hoặc giải thích.`,
            },
          ],
        });
        rawContent = response.message.content;
        analysis = parseStructuredResponse(rawContent, matchAnalysisSchema);
      }

      this.logger.log(
        [
          "Ollama match request completed:",
          `model=${this.model}`,
          `elapsedMs=${Date.now() - startedAt}`,
          `responseChars=${rawContent.length}`,
          `evaluations=${analysis.evaluations.length}`,
          `strengths=${analysis.strengths.length}`,
          `risks=${analysis.risks.length}`,
          formatOllamaMetrics(response as unknown),
        ].filter(Boolean).join(" "),
      );

      return analysis;
    } catch (error) {
      this.logger.warn(
        [
          "Ollama match request failed:",
          `model=${this.model}`,
          `elapsedMs=${Date.now() - startedAt}`,
          `criteria=${input.criteria.length}`,
          `cvChars=${input.cvText.length}`,
          `error=${toSafeLogMessage(error)}`,
        ].join(" "),
      );
      throw error;
    }
  }

  async extractProfile(input: ExtractProfileInput): Promise<ExtractedProfile> {
    const prompt = buildExtractProfilePrompt({
      fileName: input.fileName,
      cvText: input.cvText.slice(0, MAX_PROFILE_CV_CHARACTERS),
    });
    const startedAt = Date.now();

    try {
      const response = await this.client.chat({
        model: this.model,
        stream: false,
        think: false,
        keep_alive: "10m",
        format: z.toJSONSchema(extractedProfileSchema),
        options: { temperature: 0, num_ctx: this.contextLength },
        messages: [
          {
            role: "system",
            content: "Bạn là trợ lý tuyển dụng. Trích xuất thông tin hồ sơ chỉ dựa trên nội dung CV.",
          },
          { role: "user", content: prompt },
        ],
      });
      const parsed = parseStructuredResponse(response.message.content, extractedProfileSchema);

      this.logger.log(
        `Ollama profile extract completed: model=${this.model} elapsedMs=${Date.now() - startedAt} skills=${parsed.skills.length}`,
      );

      return {
        fullName: parsed.fullName,
        title: parsed.title,
        yearsExperience: parsed.totalYearsExperience,
        skills: parsed.skills,
        languages: parsed.languages,
      };
    } catch (error) {
      this.logger.warn(
        `Ollama profile extract failed: model=${this.model} elapsedMs=${Date.now() - startedAt} error=${toSafeLogMessage(error)}`,
      );
      throw error;
    }
  }
}

export function parseStructuredResponse<T>(raw: string, schema: z.ZodType<T>): T {
  const stripped = stripJsonCodeFence(raw.trim());
  const extracted = extractFirstJsonObject(stripped);
  const candidates = extracted && extracted !== stripped
    ? [stripped, extracted]
    : [stripped];
  const errors: string[] = [];

  for (const candidate of candidates) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(candidate) as unknown;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Invalid JSON");
      continue;
    }

    const result = schema.safeParse(parsed);
    if (result.success) return result.data;
    errors.push(formatSchemaIssues(result.error));
  }

  throw new StructuredResponseError(errors.at(-1) ?? "No JSON object found");
}

class StructuredResponseError extends Error {
  constructor(detail: string) {
    super(`Invalid structured AI response: ${detail}`);
    this.name = "StructuredResponseError";
  }
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
      if (depth === 0) return value.slice(start, index + 1);
    }
  }

  return undefined;
}

function formatSchemaIssues(error: z.ZodError) {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    .join("; ");
}

function getPositiveIntegerConfig(configService: ConfigService, key: string, fallback: number) {
  const value = configService.get<number | string>(key);
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function createTimeoutFetch(timeoutMs: number): typeof fetch {
  return (input, init) => {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal
      ? AbortSignal.any([init.signal, timeoutSignal])
      : timeoutSignal;

    return fetch(input, { ...init, signal });
  };
}

function formatOllamaMetrics(response: unknown) {
  const record = toRecord(response);
  if (!record) return "";

  const totalDuration = getNumber(record, "total_duration");
  const loadDuration = getNumber(record, "load_duration");
  const promptEvalCount = getNumber(record, "prompt_eval_count");
  const promptEvalDuration = getNumber(record, "prompt_eval_duration");
  const evalCount = getNumber(record, "eval_count");
  const evalDuration = getNumber(record, "eval_duration");
  const promptTokensPerSecond = calculateTokensPerSecond(promptEvalCount, promptEvalDuration);
  const outputTokensPerSecond = calculateTokensPerSecond(evalCount, evalDuration);

  return [
    formatDurationMetric("ollamaTotalMs", totalDuration),
    formatDurationMetric("ollamaLoadMs", loadDuration),
    formatCountMetric("promptTokens", promptEvalCount),
    formatDurationMetric("promptEvalMs", promptEvalDuration),
    formatDecimalMetric("promptTokensPerSecond", promptTokensPerSecond),
    formatCountMetric("outputTokens", evalCount),
    formatDurationMetric("outputEvalMs", evalDuration),
    formatDecimalMetric("outputTokensPerSecond", outputTokensPerSecond),
  ].filter(Boolean).join(" ");
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function getNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function calculateTokensPerSecond(tokens?: number, durationNs?: number) {
  if (!tokens || !durationNs) return undefined;
  const seconds = durationNs / 1_000_000_000;
  return seconds > 0 ? tokens / seconds : undefined;
}

function formatDurationMetric(name: string, durationNs?: number) {
  return durationNs === undefined ? "" : `${name}=${Math.round(durationNs / 1_000_000)}`;
}

function formatCountMetric(name: string, value?: number) {
  return value === undefined ? "" : `${name}=${value}`;
}

function formatDecimalMetric(name: string, value?: number) {
  return value === undefined ? "" : `${name}=${value.toFixed(2)}`;
}

function toSafeLogMessage(error: unknown) {
  return error instanceof Error ? JSON.stringify(error.message) : JSON.stringify(String(error));
}
