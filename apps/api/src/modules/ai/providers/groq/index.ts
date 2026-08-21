import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Groq from "groq-sdk";
import { z } from "zod";
import { buildCvSummaryPrompt, buildExtractProfilePrompt, buildMatchPrompt, buildSourcingPlanPrompt } from "../../prompts";
import { cvSummarySchema, extractedProfileSchema, matchAnalysisSchema, sourcingPlanSchema } from "../../../../schemas/ai";
import type {
  AiProvider,
  AnalyzeMatchInput,
  CvSummary,
  ExtractProfileInput,
  ExtractedProfile,
  ProviderMatchAnalysis,
  SourcingPlan,
  SourcingPlanInput,
  SummarizeCvInput,
} from "../../../../models/ai";

const MAX_PROFILE_CV_CHARACTERS = 45_000;
const MAX_SUMMARY_CV_CHARACTERS = 45_000;
const DEFAULT_MODEL = "openai/gpt-oss-120b";

type GroqTask = "matching" | "profile-extraction" | "cv-summary" | "sourcing-plan";

@Injectable()
export class GroqAiProvider implements AiProvider {
  readonly name = "groq";
  readonly model: string;
  private readonly client: Groq;
  private readonly logger = new Logger(GroqAiProvider.name);
  private readonly timeoutMs: number;
  private readonly sourcingTimeoutMs: number;
  private readonly configService: ConfigService;
  private readonly modelCooldowns = new Map<string, number>();

  constructor(configService: ConfigService) {
    this.configService = configService;
    this.model = configService.get<string>("GROQ_MODEL") ?? DEFAULT_MODEL;
    this.timeoutMs = getPositiveIntegerConfig(configService, "GROQ_TIMEOUT_MS", 120_000);
    this.sourcingTimeoutMs = getPositiveIntegerConfig(configService, "GROQ_SOURCING_TIMEOUT_MS", 15_000);
    this.client = new Groq({
      apiKey: configService.get<string>("GROQ_API_KEY") || "disabled-placeholder",
      timeout: this.timeoutMs,
      // Model fallback and quota backoff are managed here instead of issuing
      // hidden SDK retries against the same exhausted model.
      maxRetries: 0,
    });
    this.logger.log(`Groq provider configured: modelChain=${this.getModelChain("matching").join(",")} timeoutMs=${this.timeoutMs}`);
  }

  async analyzeMatch(input: AnalyzeMatchInput): Promise<ProviderMatchAnalysis> {
    return this.withModelFallback("matching", model => this.analyzeMatchWithModel(input, model));
  }

  private async analyzeMatchWithModel(input: AnalyzeMatchInput, model: string): Promise<ProviderMatchAnalysis> {
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
        `model=${model}`,
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
        model,
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
          model,
        );
        analysis = parseStructuredResponse(rawContent, matchAnalysisSchema, normalizeMatchAnalysisCandidate);
      }

      this.logger.log(
        [
          "Groq match request completed:",
          `model=${model}`,
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
          `model=${model}`,
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
    return this.withModelFallback("profile-extraction", model => this.extractProfileWithModel(input, model));
  }

  private async extractProfileWithModel(input: ExtractProfileInput, model: string): Promise<ExtractedProfile> {
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
        model,
      );
      const parsed = parseStructuredResponse(rawContent, extractedProfileSchema);

      this.logger.log(
        `Groq profile extract completed: model=${model} elapsedMs=${Date.now() - startedAt} skills=${parsed.skills.length}`,
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
        `Groq profile extract failed: model=${model} elapsedMs=${Date.now() - startedAt} error=${toSafeLogMessage(error)}`,
      );
      throw error;
    }
  }

  async summarizeCv(input: SummarizeCvInput): Promise<CvSummary> {
    return this.withModelFallback("cv-summary", model => this.summarizeCvWithModel(input, model));
  }

  async planSourcing(input: SourcingPlanInput): Promise<SourcingPlan> {
    return this.withModelFallback("sourcing-plan", model => this.planSourcingWithModel(input, model));
  }

  private async planSourcingWithModel(input: SourcingPlanInput, model: string): Promise<SourcingPlan> {
    const prompt = buildSourcingPlanPrompt(input);
    const startedAt = Date.now();

    try {
      const rawContent = await this.createStructuredCompletion(
        [
          {
            role: "system",
            content: "Bạn là trợ lý sourcing. Chỉ mở rộng query từ dữ liệu JD và chỉ trả về JSON hợp lệ.",
          },
          { role: "user", content: prompt },
        ],
        model,
        this.sourcingTimeoutMs,
      );
      const plan = parseStructuredResponse(rawContent, sourcingPlanSchema);
      this.logger.log(
        `Groq sourcing plan completed: model=${model} elapsedMs=${Date.now() - startedAt} titles=${plan.titleVariants.length} skills=${plan.skillSignals.length}`,
      );
      return plan;
    } catch (error) {
      this.logger.warn(
        `Groq sourcing plan failed: model=${model} elapsedMs=${Date.now() - startedAt} error=${toSafeLogMessage(error)}`,
      );
      throw error;
    }
  }

  private async summarizeCvWithModel(input: SummarizeCvInput, model: string): Promise<CvSummary> {
    const prompt = buildCvSummaryPrompt({
      cvText: input.cvText.slice(0, MAX_SUMMARY_CV_CHARACTERS),
    });
    const startedAt = Date.now();
    const baseMessages = [
      {
        role: "system" as const,
        content: [
          "Bạn là trợ lý tuyển dụng.",
          "Tóm tắt CV độc lập với JD, chỉ dựa trên nội dung CV.",
          "Chỉ trả về một JSON object hợp lệ, không markdown, không giải thích.",
        ].join(" "),
      },
      { role: "user" as const, content: prompt },
    ];

    try {
      let rawContent = await this.createStructuredCompletion(baseMessages, model);
      let summary: CvSummary;

      try {
        summary = parseStructuredResponse(rawContent, cvSummarySchema, normalizeCvSummaryCandidate);
      } catch (error) {
        if (!(error instanceof StructuredResponseError)) throw error;

        this.logger.warn(`Groq CV summary response requires repair: ${error.message}`);
        rawContent = await this.createStructuredCompletion([
          ...baseMessages,
          { role: "assistant" as const, content: rawContent },
          {
            role: "user" as const,
            content: `JSON vừa trả về không đúng schema (${error.message}). Hãy sửa và chỉ trả về một JSON object hợp lệ, không có markdown hoặc giải thích.`,
          },
        ], model);
        summary = parseStructuredResponse(rawContent, cvSummarySchema, normalizeCvSummaryCandidate);
      }

      this.logger.log(
        `Groq CV summary completed: model=${model} elapsedMs=${Date.now() - startedAt} cvChars=${input.cvText.length}`,
      );

      return summary;
    } catch (error) {
      this.logger.warn(
        `Groq CV summary failed: model=${model} elapsedMs=${Date.now() - startedAt} cvChars=${input.cvText.length} error=${toSafeLogMessage(error)}`,
      );
      throw error;
    }
  }

  private async createStructuredCompletion(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    model: string,
    timeoutMs?: number,
  ) {
    try {
      const request = {
        model,
        messages,
        temperature: 0,
        response_format: { type: "json_object" as const },
      };
      const response = timeoutMs
        ? await this.client.chat.completions.create(request, { timeout: timeoutMs })
        : await this.client.chat.completions.create(request);

      return response.choices[0]?.message?.content?.trim() ?? "";
    } catch (error) {
      this.raiseIfQuota(error);
      throw error;
    }
  }

  private async withModelFallback<T>(task: GroqTask, operation: (model: string) => Promise<T>): Promise<T> {
    const modelChain = this.getAvailableModels(this.getModelChain(task));
    const modelsToTry = modelChain.length ? modelChain : this.getModelChain(task);
    let lastError: unknown;

    for (const model of modelsToTry) {
      try {
        return await operation(model);
      } catch (error) {
        lastError = error;
        if (!isFallbackError(error)) throw error;

        if (error instanceof QuotaExceededError) {
          this.cooldownModel(model, error.retryAfterMs);
        }

        this.logger.warn(`Groq model fallback: task=${task} model=${model} error=${toSafeLogMessage(error)}`);
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Groq request failed for every configured model");
  }

  private getModelChain(task: GroqTask) {
    const taskKey = {
      matching: "GROQ_MATCH_MODEL_CHAIN",
      "profile-extraction": "GROQ_EXTRACTION_MODEL_CHAIN",
      "cv-summary": "GROQ_SUMMARY_MODEL_CHAIN",
      "sourcing-plan": "GROQ_SOURCING_MODEL_CHAIN",
    }[task];
    const taskChain = parseModelChain(this.configService.get<string>(taskKey));
    if (taskChain.length) return taskChain;

    const configuredChain = parseModelChain(this.configService.get<string>("GROQ_MODEL_CHAIN"));
    if (configuredChain.length) return configuredChain;

    const legacyModel = this.configService.get<string>("GROQ_MODEL")?.trim();
    return legacyModel ? [legacyModel] : [DEFAULT_MODEL];
  }

  private getAvailableModels(modelChain: string[]) {
    const now = Date.now();
    return modelChain.filter(model => (this.modelCooldowns.get(model) ?? 0) <= now);
  }

  private cooldownModel(model: string, retryAfterMs: number) {
    this.modelCooldowns.set(model, Date.now() + retryAfterMs);
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

function normalizeCvSummaryCandidate(value: unknown) {
  const record = unwrapKnownPayload(value, ["cvSummary", "summary", "result"]);
  if (!record) return value;

  return {
    overview: typeof record.overview === "string"
      ? record.overview
      : typeof record.summary === "string"
        ? record.summary
        : "Chưa có tóm tắt CV.",
    currentTitle: nullableString(record.currentTitle ?? record.title),
    totalExperience: nullableString(record.totalExperience ?? record.yearsExperience),
    keySkills: stringArray(record.keySkills ?? record.skills),
    workExperiences: workExperienceArray(record.workExperiences ?? record.experiences ?? record.workHistory),
    workCompanies: stringArray(record.workCompanies ?? record.companies ?? record.employers),
    workHighlights: stringArray(record.workHighlights ?? record.highlights ?? record.experienceHighlights),
    education: stringArray(record.education),
    languages: stringArray(record.languages),
    notesForTa: stringArray(record.notesForTa ?? record.notes ?? record.taNotes),
  };
}

function nullableString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function stringArray(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return typeof value === "string" ? [value] : [];
}

function workExperienceArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      const record = toRecord(item);
      if (!record) return null;
      const company = nullableString(record.company ?? record.employer ?? record.organization)?.trim();
      if (!company) return null;
      return {
        company,
        title: nullableString(record.title ?? record.position ?? record.role),
        duration: nullableString(record.duration ?? record.period ?? record.dateRange ?? record.time),
      };
    })
    .filter((item): item is { company: string; title: string | null; duration: string | null } => Boolean(item));
}

function unwrapKnownPayload(value: unknown, keys: string[]) {
  const record = toRecord(value);
  if (!record) return undefined;
  if (typeof record.overview === "string") return record;

  for (const key of keys) {
    const nested = toRecord(record[key]);
    if (nested && typeof nested.overview === "string") return nested;
  }

  return record;
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

function parseModelChain(value: string | undefined) {
  const seen = new Set<string>();
  return (value ?? "")
    .split(",")
    .map(model => model.trim())
    .filter(model => {
      if (!model || seen.has(model)) return false;
      seen.add(model);
      return true;
    });
}

function isFallbackError(error: unknown) {
  if (error instanceof QuotaExceededError) return true;
  if (!error || typeof error !== "object") return false;

  const record = error as { status?: number; code?: string; name?: string };
  return [404, 429, 500, 502, 503, 504].includes(record.status ?? 0)
    || record.code === "model_not_found"
    || record.code === "rate_limit_exceeded"
    || record.name === "AbortError";
}

function toSafeLogMessage(error: unknown) {
  if (error instanceof Error) return error.message.replace(/gsk_[a-z0-9_-]+/giu, "[redacted]");
  return String(error).replace(/gsk_[a-z0-9_-]+/giu, "[redacted]");
}
