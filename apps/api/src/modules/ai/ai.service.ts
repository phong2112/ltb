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
import { CvTextExtractorService } from "./cv-text-extractor.service";
import { calculateConfidence, calculateMatchScore, extractMatchCriteria } from "./match-scoring";

const MAX_AI_CV_CHARACTERS = 45_000;
const MAX_JOB_DESCRIPTION_CHARACTERS = 12_000;

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly textExtractor: CvTextExtractorService,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
  ) {}

  async processApplication(applicationId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: true,
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

    await this.prisma.cvParseResult.update({
      where: { applicationId },
      data: {
        status: CvParseStatus.PENDING,
        errorMessage: null,
        candidateFileId: cvFile.id,
      },
    });

    const extracted = await this.textExtractor.extract(cvFile);
    const criteria = extractMatchCriteria(htmlToPlainText(application.job.requirements));
    const analysis = await this.provider.analyzeMatch({
      jobTitle: application.job.title,
      jobDescription: htmlToPlainText(application.job.description).slice(0, MAX_JOB_DESCRIPTION_CHARACTERS),
      criteria,
      cvText: extracted.text.slice(0, MAX_AI_CV_CHARACTERS),
    });
    const normalizedEvaluations = normalizeEvaluations(criteria, analysis.evaluations);
    const score = calculateMatchScore(criteria, normalizedEvaluations);
    const confidence = calculateConfidence(criteria, normalizedEvaluations);
    const missingRequirements = buildMissingRequirements(criteria, normalizedEvaluations);

    await this.prisma.$transaction([
      this.prisma.cvParseResult.update({
        where: { applicationId },
        data: {
          status: CvParseStatus.COMPLETED,
          summary: analysis.summary,
          extractedText: extracted.text,
          errorMessage: null,
          structuredData: {
            source: "ai_match",
            provider: this.provider.name,
            model: this.provider.model,
            promptVersion: MATCH_PROMPT_VERSION,
            parser: extracted.parser,
            confidence,
            inputTruncated: extracted.text.length > MAX_AI_CV_CHARACTERS,
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
          candidateFileId: cvFile.id,
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

  async markFailed(applicationId: string, error: unknown) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { candidateId: true, jobId: true, cvParseResult: { select: { candidateFileId: true } } },
    });

    if (!application) return;

    const errorMessage = toSafeErrorMessage(error);

    await this.prisma.$transaction([
      this.prisma.cvParseResult.update({
        where: { applicationId },
        data: {
          status: CvParseStatus.FAILED,
          summary: "Không thể phân tích CV tự động. HR vẫn có thể xem CV và đánh giá thủ công.",
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
          action: "ai_match_failed",
          metadata: { error: errorMessage },
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

function toSafeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown AI processing error";

  if (/fetch failed|ECONNREFUSED|connect/i.test(message)) {
    return "Không thể kết nối tới Ollama. Kiểm tra container và model Qwen.";
  }

  if (/extractable text|Unsupported CV|extraction size/i.test(message)) {
    return message;
  }

  return "AI không trả về kết quả hợp lệ. Hãy thử lại hoặc đánh giá CV thủ công.";
}
