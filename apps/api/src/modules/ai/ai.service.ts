import { Inject, Injectable } from "@nestjs/common";
import { CvParseStatus, FileKind, Prisma } from "@prisma/client";
import sanitizeHtml from "sanitize-html";
import { PrismaService } from "../prisma/prisma.service";
import { MATCH_PROMPT_VERSION } from "./ai.prompt";
import {
  AI_PROVIDER,
  type AiProvider,
  type CriterionEvaluation,
  type MatchCriterion,
} from "./ai.types";
import { CvTextExtractorService, type ExtractedCvText } from "./cv-text-extractor.service";
import { calculateConfidence, calculateMatchScore, extractMatchCriteria } from "./match-scoring";

const MAX_AI_CV_CHARACTERS = 45_000;
const MAX_JOB_DESCRIPTION_CHARACTERS = 12_000;
const CV_EXTRACTION_VERSION = "cv-text-extraction-v1";

type ExtractedApplicationCv = {
  candidateFileId: string;
  text: string;
  parser?: ExtractedCvText["parser"];
};

export type AiProcessingStage = "extraction" | "analysis" | "queue";

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly textExtractor: CvTextExtractorService,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
  ) {}

  async processApplication(applicationId: string) {
    const extracted = await this.extractApplicationCv(applicationId);
    await this.analyzeApplication(applicationId, extracted);
  }

  async extractApplicationCv(applicationId: string): Promise<ExtractedApplicationCv> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        cvParseResult: true,
        files: {
          where: { kind: FileKind.CV },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!application) {
      throw new Error("Application not found");
    }

    const cvFile = application.files[0];

    if (!cvFile) {
      throw new Error("Uploaded CV file is required for AI matching");
    }

    const existingText = application.cvParseResult?.candidateFileId === cvFile.id
      ? application.cvParseResult.extractedText?.trim()
      : undefined;
    const existingMetadata = asInputJsonObject(application.cvParseResult?.structuredData);

    if (existingText) {
      if (
        application.cvParseResult?.status !== CvParseStatus.ANALYZING &&
        application.cvParseResult?.status !== CvParseStatus.COMPLETED
      ) {
        await this.prisma.cvParseResult.update({
          where: { applicationId },
          data: {
            status: CvParseStatus.EXTRACTED,
            summary: "Đã trích xuất nội dung CV và đang chờ phân tích mức độ phù hợp.",
            errorMessage: null,
          },
        });
      }

      return {
        candidateFileId: cvFile.id,
        text: existingText,
        parser: readParser(existingMetadata.parser),
      };
    }

    await this.prisma.cvParseResult.update({
      where: { applicationId },
      data: {
        status: CvParseStatus.EXTRACTING,
        summary: "Đang trích xuất nội dung từ CV.",
        errorMessage: null,
        candidateFileId: cvFile.id,
      },
    });

    const extracted = await this.textExtractor.extract(cvFile);

    await this.prisma.$transaction([
      this.prisma.cvParseResult.update({
        where: { applicationId },
        data: {
          status: CvParseStatus.EXTRACTED,
          summary: "Đã trích xuất nội dung CV và đang chờ phân tích mức độ phù hợp.",
          extractedText: extracted.text,
          errorMessage: null,
          structuredData: {
            ...existingMetadata,
            source: "cv_extraction",
            parser: extracted.parser,
            extractionVersion: CV_EXTRACTION_VERSION,
            extractedCharacters: extracted.text.length,
            fileName: cvFile.originalName,
          } satisfies Prisma.InputJsonObject,
        },
      }),
      this.prisma.activityLog.create({
        data: {
          candidateId: application.candidateId,
          applicationId: application.id,
          jobId: application.jobId,
          candidateFileId: cvFile.id,
          actor: "system",
          action: "cv_extraction_completed",
          metadata: {
            parser: extracted.parser,
            extractionVersion: CV_EXTRACTION_VERSION,
            extractedCharacters: extracted.text.length,
          },
        },
      }),
    ]);

    return {
      candidateFileId: cvFile.id,
      text: extracted.text,
      parser: extracted.parser,
    };
  }

  async analyzeApplication(applicationId: string, extractedInput?: ExtractedApplicationCv) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: true,
        cvParseResult: true,
      },
    });

    if (!application) {
      throw new Error("Application not found");
    }

    const extractedText = extractedInput?.text ?? application.cvParseResult?.extractedText;
    const candidateFileId = extractedInput?.candidateFileId ?? application.cvParseResult?.candidateFileId;

    if (!extractedText || !candidateFileId) {
      throw new Error("Extracted CV text is required for AI matching");
    }

    await this.prisma.cvParseResult.update({
      where: { applicationId },
      data: {
        status: CvParseStatus.ANALYZING,
        summary: "Đang phân tích CV và đối chiếu với yêu cầu công việc.",
        errorMessage: null,
      },
    });

    const criteria = extractMatchCriteria(htmlToPlainText(application.job.requirements));
    const analysis = await this.provider.analyzeMatch({
      jobTitle: application.job.title,
      jobDescription: htmlToPlainText(application.job.description).slice(0, MAX_JOB_DESCRIPTION_CHARACTERS),
      criteria,
      cvText: extractedText.slice(0, MAX_AI_CV_CHARACTERS),
    });
    const normalizedEvaluations = normalizeEvaluations(criteria, analysis.evaluations);
    const score = calculateMatchScore(criteria, normalizedEvaluations);
    const confidence = calculateConfidence(criteria, normalizedEvaluations);
    const missingRequirements = buildMissingRequirements(criteria, normalizedEvaluations);
    const extractionMetadata = asInputJsonObject(application.cvParseResult?.structuredData);

    await this.prisma.$transaction([
      this.prisma.cvParseResult.update({
        where: { applicationId },
        data: {
          status: CvParseStatus.COMPLETED,
          summary: analysis.summary,
          extractedText,
          errorMessage: null,
          structuredData: {
            ...extractionMetadata,
            source: "ai_match",
            provider: this.provider.name,
            model: this.provider.model,
            promptVersion: MATCH_PROMPT_VERSION,
            parser: extractedInput?.parser ?? extractionMetadata.parser ?? "unknown",
            confidence,
            inputTruncated: extractedText.length > MAX_AI_CV_CHARACTERS,
            profile: analysis.profile,
            criteria: criteria.map((criterion) => ({
              ...criterion,
              evaluation: normalizedEvaluations.get(criterion.id),
            })),
          } satisfies Prisma.InputJsonObject,
        },
      }),
      this.prisma.matchResult.upsert({
        where: { applicationId },
        create: {
          applicationId,
          score,
          strengths: analysis.strengths,
          risks: analysis.risks,
          missingRequirements,
          screeningQuestions: analysis.screeningQuestions,
        },
        update: {
          score,
          strengths: analysis.strengths,
          risks: analysis.risks,
          missingRequirements,
          screeningQuestions: analysis.screeningQuestions,
        },
      }),
      this.prisma.activityLog.create({
        data: {
          candidateId: application.candidateId,
          applicationId: application.id,
          jobId: application.jobId,
          candidateFileId,
          actor: "system",
          action: "ai_match_completed",
          metadata: {
            score,
            confidence,
            provider: this.provider.name,
            model: this.provider.model,
            promptVersion: MATCH_PROMPT_VERSION,
          },
        },
      }),
    ]);
  }

  async markFailed(applicationId: string, error: unknown, stage: AiProcessingStage = "analysis") {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { candidateId: true, jobId: true, cvParseResult: { select: { candidateFileId: true } } },
    });

    if (!application) return;

    const errorMessage = toSafeErrorMessage(error, stage);
    const summary = stage === "extraction"
      ? "Không thể trích xuất nội dung CV tự động. HR vẫn có thể xem CV và đánh giá thủ công."
      : stage === "queue"
        ? "Đã trích xuất CV nhưng không thể bắt đầu phân tích AI. HR vẫn có thể đánh giá thủ công."
        : "Không thể phân tích CV tự động. HR vẫn có thể xem CV và đánh giá thủ công.";

    await this.prisma.$transaction([
      this.prisma.cvParseResult.update({
        where: { applicationId },
        data: {
          status: CvParseStatus.FAILED,
          summary,
          errorMessage,
        },
      }),
      this.prisma.activityLog.create({
        data: {
          candidateId: application.candidateId,
          applicationId,
          jobId: application.jobId,
          candidateFileId: application.cvParseResult?.candidateFileId,
          actor: "system",
          action: stage === "extraction" ? "cv_extraction_failed" : "ai_match_failed",
          metadata: { error: errorMessage, stage },
        },
      }),
    ]);
  }
}

function normalizeEvaluations(criteria: MatchCriterion[], evaluations: CriterionEvaluation[]) {
  const evaluationById = new Map(evaluations.map((evaluation) => [evaluation.criterionId, evaluation]));

  return new Map(criteria.map((criterion) => {
    const evaluation = evaluationById.get(criterion.id) ?? {
      criterionId: criterion.id,
      status: "unknown" as const,
      evidence: [],
      reason: "CV không cung cấp đủ thông tin cho tiêu chí này.",
    };

    return [criterion.id, evaluation];
  }));
}

function buildMissingRequirements(criteria: MatchCriterion[], evaluations: Map<string, CriterionEvaluation>) {
  return criteria.flatMap((criterion) => {
    const evaluation = evaluations.get(criterion.id);
    if (!evaluation || evaluation.status === "met") return [];

    const label = evaluation.status === "unknown" ? "Chưa đủ thông tin" : evaluation.status === "partial" ? "Đáp ứng một phần" : "Chưa đáp ứng";
    return [`${label}: ${criterion.text}`];
  });
}

function htmlToPlainText(value: string) {
  const withLineBreaks = value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|li|div|h[1-6])>/gi, "\n");

  return sanitizeHtml(withLineBreaks, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function asInputJsonObject(value: Prisma.JsonValue | null | undefined): Prisma.InputJsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Prisma.InputJsonObject;
}

function readParser(value: Prisma.InputJsonValue | null | undefined): ExtractedCvText["parser"] | undefined {
  if (value === "pdf-parse" || value === "mammoth" || value === "word-extractor") return value;
  return undefined;
}

function toSafeErrorMessage(error: unknown, stage: AiProcessingStage) {
  const message = error instanceof Error ? error.message : "Unknown AI processing error";

  if (stage === "analysis" && /fetch failed|ECONNREFUSED|connect/i.test(message)) {
    return "Không thể kết nối tới Ollama. Kiểm tra container và model Qwen.";
  }

  if (/extractable text|Unsupported CV|extraction size/i.test(message)) {
    return message;
  }

  if (stage === "extraction") {
    return "Không thể đọc nội dung CV. Hãy kiểm tra định dạng tệp hoặc đánh giá CV thủ công.";
  }

  if (stage === "queue") {
    return "Không thể đưa hồ sơ vào hàng đợi phân tích AI. Hãy thử lại sau.";
  }

  return "AI không trả về kết quả hợp lệ. Hãy thử lại hoặc đánh giá CV thủ công.";
}
