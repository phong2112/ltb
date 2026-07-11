import { Injectable, NotFoundException } from "@nestjs/common";
import { ApplicationStatus, FileKind, Prisma } from "@prisma/client";
import { AiService } from "../ai/ai.service";
import { CvStorageService } from "../files/cv-storage.service";
import { JobsService } from "../jobs/jobs.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateApplicationDto } from "./dto/create-application.dto";

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly cvStorageService: CvStorageService,
    private readonly jobsService: JobsService,
  ) {}

  async createApplication(dto: CreateApplicationDto, cv?: Express.Multer.File) {
    const job = await this.jobsService.getAdminJob(dto.jobId).catch(() => {
      throw new NotFoundException("Job not found");
    });

    const normalizedEmail = normalizeEmail(dto.email);
    const normalizedPhone = normalizePhone(dto.phone);
    const candidateEmail = dto.email.trim();
    const candidatePhone = dto.phone?.trim() || undefined;

    const created = await this.prisma
      .$transaction(async (tx) => {
        const existingCandidate = await tx.candidate.findFirst({
          where: { normalizedEmail },
          orderBy: { createdAt: "asc" },
        });

        const candidate =
          existingCandidate ??
          (await tx.candidate.create({
            data: {
              fullName: dto.fullName,
              email: candidateEmail,
              normalizedEmail,
              phone: candidatePhone,
              normalizedPhone,
              linkedinUrl: dto.linkedinUrl,
              portfolioUrl: dto.portfolioUrl,
              source: "career_site",
            },
          }));

        const application = await tx.application.create({
          data: {
            candidateId: candidate.id,
            jobId: job.id,
            normalizedEmail,
            normalizedPhone,
            salaryExpectation: dto.salaryExpectation,
            noticePeriod: dto.noticePeriod,
            answers: dto.screeningAnswers ? { text: dto.screeningAnswers } : undefined,
            consentAccepted: dto.consentAccepted,
          },
        });

        return { candidate, application };
      })
      .catch((error: unknown) => {
        if (isDuplicateApplicationError(error)) {
          return null;
        }

        throw error;
      });

    if (!created) {
      return {
        applicationId: null,
        candidateId: null,
        status: ApplicationStatus.NEW,
      };
    }

    const { candidate, application } = created;

    let candidateFileId: string | undefined;

    if (cv) {
      const storedCv = await this.cvStorageService.storeCandidateCv(cv, candidate.id, application.id);

      const candidateFile = await this.prisma.candidateFile.create({
        data: {
          candidateId: candidate.id,
          applicationId: application.id,
          kind: FileKind.CV,
          originalName: storedCv.originalName,
          storedName: storedCv.storedName,
          mimeType: storedCv.mimeType,
          sizeBytes: storedCv.sizeBytes,
          path: storedCv.path,
        },
      });

      candidateFileId = candidateFile.id;
    }

    const cvSignal = cv?.originalname ?? dto.portfolioUrl ?? "candidate-provided-link";

    const match = this.aiService.createInitialMatch({
      fullName: candidate.fullName,
      jobTitle: job.title,
      jobRequirements: job.requirements,
      fileName: cvSignal,
    });

    await this.prisma.cvParseResult.create({
      data: {
        applicationId: application.id,
        candidateFileId,
        status: "pending",
        summary: match.summary,
        structuredData: {
          source: "mvp_stub",
          cvSource: cv ? "uploaded_file" : "external_link",
          fileName: cvSignal,
        },
      },
    });

    await this.prisma.matchResult.create({
      data: {
        applicationId: application.id,
        score: match.matchScore,
        strengths: match.strengths,
        risks: match.risks,
        missingRequirements: match.missingRequirements,
        screeningQuestions: match.screeningQuestions,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        candidateId: candidate.id,
        actor: "candidate",
        action: "application_submitted",
        metadata: {
          jobId: job.id,
          jobTitle: job.title,
        },
      },
    });

    return {
      applicationId: application.id,
      candidateId: candidate.id,
      status: application.status,
    };
  }
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value?: string) {
  const digits = value?.replace(/\D/g, "") ?? "";

  if (!digits) return undefined;
  if (digits.length === 11 && digits.startsWith("84")) {
    return `0${digits.slice(2)}`;
  }

  return digits;
}

function isDuplicateApplicationError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const target = Array.isArray(error.meta?.target) ? error.meta.target : [];

  return (
    (target.includes("candidateId") && target.includes("jobId")) ||
    (target.includes("jobId") && target.includes("normalizedEmail")) ||
    (target.includes("jobId") && target.includes("normalizedPhone"))
  );
}
