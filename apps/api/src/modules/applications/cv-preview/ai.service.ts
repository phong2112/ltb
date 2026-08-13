import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { applicationAreas } from "@hr-copilot/shared";
import { buildApplicationPreviewPrompt } from "../../ai/prompts";
import { AiModelPortalService } from "../../ai/portal/index.service";
import { applicationPreviewExtractionSchema } from "../../../schemas/ai";
import type { ApplicationPreviewExtraction } from "../../../models/ai";

const MAX_PREVIEW_CV_CHARACTERS = 20_000;
const DEFAULT_GEMINI_TIMEOUT_MS = 20_000;

@Injectable()
export class ApplicationCvPreviewAiService {
  private readonly logger = new Logger(ApplicationCvPreviewAiService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly aiPortal: AiModelPortalService,
  ) {}

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
    const timeoutMs = this.configService.get<number>("GEMINI_TIMEOUT_MS") ?? DEFAULT_GEMINI_TIMEOUT_MS;
    const startedAt = Date.now();

    try {
      const geminiResult = await this.aiPortal.generatePreviewJson({
        apiKey,
        prompt,
        systemInstruction: "Bạn là trợ lý tuyển dụng. Chỉ trả về JSON hợp lệ theo schema được yêu cầu.",
        timeoutMs,
      });
      const parsed = parsePreviewResponse(geminiResult.content);

      this.logger.log(
        `Gemini preview extraction completed: model=${geminiResult.model} elapsedMs=${Date.now() - startedAt}`,
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
        `Gemini preview extraction failed: elapsedMs=${Date.now() - startedAt} error=${toSafeLogMessage(error)}`,
      );
      return null;
    }
  }
}

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
