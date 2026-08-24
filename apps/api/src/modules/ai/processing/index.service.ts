import { Inject, Injectable } from "@nestjs/common";
import { CvParseStatus, FileKind, Prisma } from "@prisma/client";
import sanitizeHtml from "sanitize-html";
import { PrismaService } from "@/modules/prisma";
import { prepareCvMatchInputForAi, prepareCvTextForAi } from "@/modules/ai/cv/cleaner";
import { CvTextExtractorService, type ExtractedCvText } from "@/modules/ai/cv/extractor/index.service";
import {
  AI_PROVIDER,
  type AiProvider,
  type CriterionEvaluation,
  type MatchCriterion,
} from "@/models/ai";
import { buildGroundedMatchInsights, groundCriterionEvaluations } from "@/modules/ai/matching/analysis";
import {
  calculateConfidence,
  calculateMatchScore,
  calculatePotentialMatchScore,
  extractMatchCriteria,
} from "@/modules/ai/matching/scoring";
import { CV_SUMMARY_PROMPT_VERSION, MATCH_PROMPT_VERSION } from "@/modules/ai/prompts";
import { sanitizeCvSummary } from "@/modules/ai/cv/sanitize";

const MAX_AI_CV_CHARACTERS = 45_000;
const MAX_JOB_DESCRIPTION_CHARACTERS = 12_000;
const CV_EXTRACTION_VERSION = "cv-text-extraction-v3";
const LOW_CONFIDENCE_OCR_WARNING = "OCR chất lượng thấp — nên kiểm tra thủ công.";

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
            qualityScore: extracted.qualityScore,
            fileName: cvFile.originalName,
            ocrUsed: extracted.parser === "tesseract-ocr",
            ...(extracted.ocrPages === undefined ? {} : { ocrPages: extracted.ocrPages }),
            ...(extracted.ocrConfidence === undefined ? {} : { ocrConfidence: extracted.ocrConfidence }),
            ...(extracted.ocrTruncated ? { ocrTruncated: true } : {}),
            ...(extracted.totalPages === undefined ? {} : { totalPages: extracted.totalPages }),
            ...(extracted.lowConfidenceOcr ? { lowConfidenceOcr: true } : {}),
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
    const aiReadyCv = prepareCvMatchInputForAi(
      extractedText,
      MAX_AI_CV_CHARACTERS,
      criteria,
      [application.submittedFullName],
    );
    const summaryReadyCv = prepareCvTextForAi(
      extractedText,
      MAX_AI_CV_CHARACTERS,
      [application.submittedFullName],
    );
    const extractionMetadata = asInputJsonObject(application.cvParseResult?.structuredData);
    let cvSummary = readStoredCvSummary(extractionMetadata.cvSummary);

    if (!cvSummary) {
      cvSummary = sanitizeCvSummary(await this.provider.summarizeCv({
        cvText: summaryReadyCv.text,
      }));

      await this.prisma.cvParseResult.update({
        where: { applicationId },
        data: {
          structuredData: {
            ...extractionMetadata,
            cvSummary,
            cvSummaryPromptVersion: CV_SUMMARY_PROMPT_VERSION,
          },
        },
      });
    }

    const analysis = await this.provider.analyzeMatch({
      jobTitle: application.job.title,
      jobDescription: htmlToPlainText(application.job.description).slice(0, MAX_JOB_DESCRIPTION_CHARACTERS),
      criteria,
      cvText: aiReadyCv.text,
    });
    const normalizedEvaluations = groundCriterionEvaluations(
      criteria,
      analysis.evaluations,
      aiReadyCv.text,
    );
    const score = calculateMatchScore(criteria, normalizedEvaluations);
    const potentialScore = calculatePotentialMatchScore(criteria, normalizedEvaluations);
    const evidenceCoverage = calculateConfidence(criteria, normalizedEvaluations);
    const lowConfidenceOcr = extractionMetadata.lowConfidenceOcr === true;
    const confidence = adjustConfidence(evidenceCoverage, extractionMetadata, aiReadyCv.truncated);
    const insights = buildGroundedMatchInsights(criteria, normalizedEvaluations);
    const summary = lowConfidenceOcr
      ? appendWarning(analysis.summary, LOW_CONFIDENCE_OCR_WARNING)
      : analysis.summary;
    const risks = lowConfidenceOcr
      ? appendUnique(insights.risks, LOW_CONFIDENCE_OCR_WARNING)
      : insights.risks;

    await this.prisma.$transaction([
      this.prisma.cvParseResult.update({
        where: { applicationId },
        data: {
          status: CvParseStatus.COMPLETED,
          summary,
          extractedText,
          errorMessage: null,
          structuredData: {
            ...extractionMetadata,
            source: "ai_match",
            provider: this.provider.name,
            model: this.provider.model,
            promptVersion: MATCH_PROMPT_VERSION,
            cvSummary,
            cvSummaryPromptVersion: CV_SUMMARY_PROMPT_VERSION,
            parser: extractedInput?.parser ?? extractionMetadata.parser ?? "unknown",
            confidence,
            evidenceCoverage,
            inputTruncated: aiReadyCv.truncated,
            aiInput: {
              sourceCharacters: aiReadyCv.sourceCharacters,
              cleanedCharacters: aiReadyCv.cleanedCharacters,
              selectedCharacters: aiReadyCv.selectedCharacters,
              omittedCharacters: aiReadyCv.omittedCharacters,
              redactionCount: aiReadyCv.redactionCount,
              strategy: aiReadyCv.strategy,
              sections: aiReadyCv.sections,
              criterionSnippetCount: aiReadyCv.criterionSnippetCount,
            },
            scoreBreakdown: {
              confirmedScore: score,
              potentialScore,
              evidenceCoverage,
              critical: countCriterionStatuses(criteria, normalizedEvaluations, "critical"),
              required: countCriterionStatuses(criteria, normalizedEvaluations, true),
              optional: countCriterionStatuses(criteria, normalizedEvaluations, false),
            },
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
          strengths: insights.strengths,
          risks,
          missingRequirements: insights.missingRequirements,
          screeningQuestions: insights.screeningQuestions,
        },
        update: {
          score,
          strengths: insights.strengths,
          risks,
          missingRequirements: insights.missingRequirements,
          screeningQuestions: insights.screeningQuestions,
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

function appendWarning(summary: string, warning: string) {
  return summary.includes(warning) ? summary : `${summary}\n\n${warning}`;
}

function appendUnique(values: string[], value: string) {
  return values.includes(value) ? values : [...values, value];
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

function readStoredCvSummary(value: Prisma.InputJsonValue | null | undefined): Prisma.InputJsonObject | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const summary = value as Prisma.InputJsonObject;
  return typeof summary.overview === "string" && summary.overview.trim() ? summary : undefined;
}

function readParser(value: Prisma.InputJsonValue | null | undefined): ExtractedCvText["parser"] | undefined {
  if (value === "pdf-parse" || value === "mammoth" || value === "word-extractor" || value === "tesseract-ocr") return value;
  return undefined;
}

function adjustConfidence(
  evidenceCoverage: number,
  extractionMetadata: Prisma.InputJsonObject,
  inputTruncated: boolean,
) {
  const ocrConfidence = typeof extractionMetadata.ocrConfidence === "number"
    ? Math.max(0, Math.min(100, extractionMetadata.ocrConfidence))
    : 100;
  const extractionFactor = extractionMetadata.lowConfidenceOcr === true
    ? ocrConfidence / 100
    : 1;
  const truncationFactor = extractionMetadata.ocrTruncated === true || inputTruncated ? 0.85 : 1;
  return Math.round(evidenceCoverage * extractionFactor * truncationFactor);
}

function countCriterionStatuses(
  criteria: MatchCriterion[],
  evaluations: Map<string, CriterionEvaluation>,
  filter: boolean | MatchCriterion["importance"],
) {
  const counts = { total: 0, met: 0, partial: 0, notMet: 0, unknown: 0 };

  for (const criterion of criteria) {
    if (typeof filter === "boolean" && criterion.required !== filter) continue;
    if (typeof filter === "string" && criterion.importance !== filter) continue;
    counts.total += 1;
    const status = evaluations.get(criterion.id)?.status ?? "unknown";
    if (status === "met") counts.met += 1;
    else if (status === "partial") counts.partial += 1;
    else if (status === "not_met") counts.notMet += 1;
    else counts.unknown += 1;
  }

  return counts;
}

function toSafeErrorMessage(error: unknown, stage: AiProcessingStage) {
  const message = error instanceof Error ? error.message : "Unknown AI processing error";

  if (stage === "analysis" && /fetch failed|ECONNREFUSED|connect/i.test(message)) {
    return "Không thể kết nối tới AI provider. Kiểm tra API key, mạng và giới hạn dịch vụ.";
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
