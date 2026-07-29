import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Groq from "groq-sdk";
import { z } from "zod";
import { buildExtractProfilePrompt, buildMatchPrompt } from "./ai.prompt";
import type {
  AiProvider,
  AnalyzeMatchInput,
  ExtractProfileInput,
  ExtractedProfile,
  ProviderMatchAnalysis,
} from "./ai.types";

const MAX_PROFILE_CV_CHARACTERS = 45_000;

const extractedProfileSchema = z.object({
  fullName: z.string().nullable(),
  title: z.string().nullable(),
  totalYearsExperience: z.number().min(0).max(60).nullable(),
  skills: z.array(z.string()).max(30),
  languages: z.array(z.string()).max(10),
});

const matchAnalysisSchema = z.object({
  summary: z.string().min(1).max(800),
  evaluations: z.array(z.object({
    criterionId: z.string(),
    status: z.enum(["met", "partial", "not_met", "unknown"]),
    evidence: z.preprocess(
      value => typeof value === "string" ? [value] : value,
      z.array(z.string()).max(3),
    ),
    reason: z.string().min(1).max(500),
  })).max(15),
});

@Injectable()
export class GroqAiProvider implements AiProvider {
  readonly name = "groq";
  readonly model: string;
  private readonly client: Groq;
  private readonly logger = new Logger(GroqAiProvider.name);
  private readonly timeoutMs: number;

  constructor(configService: ConfigService) {
    this.model = configService.get<string>("GROQ_MODEL") ?? "llama-3.3-70b-versatile";
    this.timeoutMs = getPositiveIntegerConfig(configService, "GROQ_TIMEOUT_MS", 120_000);
    this.client = new Groq({
      apiKey: configService.get<string>("GROQ_API_KEY") || "disabled-placeholder",
      timeout: this.timeoutMs,
      maxRetries: 1,
    });
    this.logger.log(`Groq provider configured: model=${this.model} timeoutMs=${this.timeoutMs}`);
  }

  async analyzeMatch(input: AnalyzeMatchInput): Promise<ProviderMatchAnalysis> {
    const prompt = buildMatchPrompt(input);
    const startedAt = Date.now();
    const baseMessages = [
      {
        role: "system" as const,
        content: [
          "Bạn là trợ lý tuyển dụng.",
          "Kết quả chỉ hỗ trợ HR ra quyết định và phải dựa trên bằng chứng trong CV.",
          "Chỉ trả về một JSON object hợp lệ, không markdown, không giải thích.",
        ].join(" "),
      },
      { role: "user" as const, content: prompt },
    ];

    this.logger.log(
      [
        "Groq match request started:",
        `model=${this.model}`,
        `criteria=${input.criteria.length}`,
        `cvChars=${input.cvText.length}`,
        `jobDescriptionChars=${input.jobDescription.length}`,
        `promptChars=${prompt.length}`,
        `timeoutMs=${this.timeoutMs}`,
      ].join(" "),
    );

    try {
      let rawContent = await this.createStructuredCompletion(
        baseMessages,
      );
      let analysis: ProviderMatchAnalysis;

      try {
        analysis = parseStructuredResponse(rawContent, matchAnalysisSchema, normalizeMatchAnalysisCandidate);
      } catch (error) {
        if (!(error instanceof StructuredResponseError)) throw error;

        this.logger.warn(`Groq structured response requires repair: ${error.message}`);
        rawContent = await this.createStructuredCompletion(
          [
            ...baseMessages,
            { role: "assistant" as const, content: rawContent },
            {
              role: "user" as const,
              content: `JSON vừa trả về không đúng schema (${error.message}). Hãy sửa và chỉ trả về một JSON object hợp lệ, không có markdown hoặc giải thích.`,
            },
          ],
        );
        analysis = parseStructuredResponse(rawContent, matchAnalysisSchema, normalizeMatchAnalysisCandidate);
      }

      this.logger.log(
        [
          "Groq match request completed:",
          `model=${this.model}`,
          `elapsedMs=${Date.now() - startedAt}`,
          `responseChars=${rawContent.length}`,
          `evaluations=${analysis.evaluations.length}`,
        ].join(" "),
      );

      return analysis;
    } catch (error) {
      this.logger.warn(
        [
          "Groq match request failed:",
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
      const rawContent = await this.createStructuredCompletion(
        [
          {
            role: "system",
            content: "Bạn là trợ lý tuyển dụng. Trích xuất thông tin hồ sơ chỉ dựa trên nội dung CV. Chỉ trả về JSON hợp lệ.",
          },
          { role: "user", content: prompt },
        ],
      );
      const parsed = parseStructuredResponse(rawContent, extractedProfileSchema);

      this.logger.log(
        `Groq profile extract completed: model=${this.model} elapsedMs=${Date.now() - startedAt} skills=${parsed.skills.length}`,
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
        `Groq profile extract failed: model=${this.model} elapsedMs=${Date.now() - startedAt} error=${toSafeLogMessage(error)}`,
      );
      throw error;
    }
  }

  private async createStructuredCompletion(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  ) {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0,
        response_format: { type: "json_object" },
      });

      return response.choices[0]?.message?.content?.trim() ?? "";
    } catch (error) {
      this.raiseIfQuota(error);
      throw error;
    }
  }

  private raiseIfQuota(error: unknown) {
    if (!error || typeof error !== "object") return;

    const groqError = error as { status?: number; code?: string; [key: string]: unknown };
    if (groqError.status === 429 || groqError.code === "rate_limit_exceeded") {
      const retryAfter = this.parseRetryAfter(error);
      throw new QuotaExceededError(retryAfter);
    }
  }

  private parseRetryAfter(error: unknown): number {
    const record = error as Record<string, unknown>;
    const header = record.headers && typeof record.headers === "object"
      ? record.headers as Record<string, string>
      : {};

    const headerValue = header["retry-after"] ?? header["x-ratelimit-reset-ms"];
    if (headerValue) {
      const parsed = Number(headerValue);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }

    const message = record.message && typeof record.message === "string"
      ? record.message
      : "";
    const match = message.match(/try again in (\d+)s/i);
    if (match) return Number(match[1]) * 1000;

    const resetMatch = message.match(/reset.*?(\d{2,})\s?s/i);
    if (resetMatch) return Number(resetMatch[1]) * 1000;

    return 60_000;
  }
}

export function parseStructuredResponse<T>(
  raw: string,
  schema: z.ZodType<T>,
  normalize?: (value: unknown) => unknown,
): T {
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

    const result = schema.safeParse(normalize ? normalize(parsed) : parsed);
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

export class QuotaExceededError extends Error {
  /** Milliseconds the caller should wait before retrying. */
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super(`AI provider quota exceeded. Retry after ${Math.ceil(retryAfterMs / 1000)}s.`);
    this.name = "QuotaExceededError";
    this.retryAfterMs = retryAfterMs;
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
    .map(issue => `${issue.path.join(".") || "root"}: ${issue.message}`)
    .join("; ");
}

function normalizeMatchAnalysisCandidate(value: unknown) {
  const record = unwrapMatchAnalysisRecord(toRecord(value));
  if (!record) return value;

  return {
    ...record,
    summary: typeof record.summary === "string" && record.summary.trim()
      ? record.summary
      : "AI đã phân tích CV và đối chiếu với các tiêu chí tuyển dụng.",
    evaluations: Array.isArray(record.evaluations)
      ? record.evaluations.map(normalizeEvaluation)
      : [],
  };
}

function unwrapMatchAnalysisRecord(record: Record<string, unknown> | undefined) {
  if (!record) return undefined;
  if (Array.isArray(record.evaluations)) return record;

  for (const key of ["analysis", "matchAnalysis", "result", "data"]) {
    const nested = toRecord(record[key]);
    if (nested && Array.isArray(nested.evaluations)) return nested;
  }

  return undefined;
}

function normalizeEvaluation(value: unknown) {
  const evaluation = toRecord(value);
  if (!evaluation) return value;

  return {
    criterionId: String(evaluation.criterionId ?? evaluation.id ?? evaluation.criterion ?? ""),
    status: normalizeCriterionStatus(evaluation.status),
    evidence: toStringArray(evaluation.evidence).slice(0, 3),
    reason: String(evaluation.reason ?? evaluation.explanation ?? "CV không cung cấp đủ thông tin cho tiêu chí này."),
  };
}

function normalizeCriterionStatus(value: unknown) {
  if (value === "met" || value === "partial" || value === "not_met" || value === "unknown") return value;
  if (value === "not met" || value === "not-met" || value === "notMet") return "not_met";
  return "unknown";
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map(item => item.trim())
      .filter(Boolean);
  }

  return typeof value === "string" && value.trim() ? [value.trim()] : [];
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function getPositiveIntegerConfig(configService: ConfigService, key: string, fallback: number) {
  const value = configService.get<number | string>(key);
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toSafeLogMessage(error: unknown) {
  if (error instanceof Error) return error.message.replace(/gsk_[a-z0-9_-]+/giu, "[redacted]");
  return String(error).replace(/gsk_[a-z0-9_-]+/giu, "[redacted]");
}
