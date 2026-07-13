import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ApplicationStatus, CvParseStatus, FileKind, JobStatus, Prisma } from "@prisma/client";
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

    if (job.status !== JobStatus.PUBLISHED) {
      throw new NotFoundException("Published job not found");
    }

    const normalizedEmail = normalizeEmail(dto.email);
    const normalizedPhone = normalizePhone(dto.phone);
    const candidateEmail = dto.email.trim();
    const candidatePhone = dto.phone.trim();
    const submittedFullName = dto.fullName.trim();
    const submittedLinkedinUrl = dto.linkedinUrl?.trim() || undefined;
    const submittedPortfolioUrl = dto.portfolioUrl?.trim() || undefined;
    const coverNote = dto.screeningAnswers?.trim() || undefined;

    const cvSignal = cv?.originalname ?? submittedPortfolioUrl ?? "candidate-provided-link";
    const match = this.aiService.createInitialMatch({
      fullName: submittedFullName,
      jobTitle: job.title,
      jobRequirements: job.requirements,
      fileName: cvSignal,
    });

    const created = await createWithContactRetry(async () =>
      this.prisma.$transaction(
        async (tx) => {
          await lockCandidateContacts(tx, normalizedEmail, normalizedPhone);

          const contactFilters: Prisma.CandidateWhereInput[] = [{ normalizedEmail }];
          if (normalizedPhone) {
            contactFilters.push({ normalizedPhone });
          }

          const contactMatches = await tx.candidate.findMany({
            where: { OR: contactFilters },
            orderBy: { createdAt: "asc" },
            take: 2,
          });
          const existingCandidate = contactMatches[0];

          if (contactMatches.length > 1 && contactMatches[0].id !== contactMatches[1].id) {
            throw new BadRequestException("Candidate email and phone match different existing profiles");
          }

          const candidate =
            existingCandidate ??
            (await tx.candidate.create({
              data: {
                fullName: submittedFullName,
                email: candidateEmail,
                normalizedEmail,
                phone: candidatePhone,
                normalizedPhone,
                linkedinUrl: submittedLinkedinUrl,
                portfolioUrl: submittedPortfolioUrl,
                source: "career_site",
              },
            }));

          const application = await tx.application.create({
            data: {
              candidateId: candidate.id,
              jobId: job.id,
              submittedFullName,
              submittedEmail: candidateEmail,
              submittedPhone: candidatePhone,
              submittedLinkedinUrl,
              submittedPortfolioUrl,
              normalizedEmail,
              normalizedPhone,
              salaryExpectation: dto.salaryExpectation,
              noticePeriod: dto.noticePeriod,
              coverNote,
              answers: {
                ...(coverNote ? { text: coverNote } : {}),
                applicationArea: dto.applicationArea,
              },
              consentAccepted: dto.consentAccepted,
            },
          });

          let candidateFileId: string | undefined;

          if (cv) {
            const storedCv = await this.cvStorageService.storeCandidateCv(cv, candidate.id, application.id);

            const candidateFile = await tx.candidateFile.create({
              data: {
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

          await tx.cvParseResult.create({
            data: {
              applicationId: application.id,
              candidateFileId,
              status: CvParseStatus.PENDING,
              summary: match.summary,
              structuredData: {
                source: "mvp_stub",
                cvSource: cv ? "uploaded_file" : "external_link",
                fileName: cvSignal,
              },
            },
          });

          await tx.matchResult.create({
            data: {
              applicationId: application.id,
              score: match.matchScore,
              strengths: match.strengths,
              risks: match.risks,
              missingRequirements: match.missingRequirements,
              screeningQuestions: match.screeningQuestions,
            },
          });

          await tx.activityLog.create({
            data: {
              candidateId: candidate.id,
              applicationId: application.id,
              jobId: job.id,
              candidateFileId,
              actor: "candidate",
              action: "application_submitted",
              metadata: {
                jobId: job.id,
                jobTitle: job.title,
                applicationId: application.id,
                ...(candidateFileId ? { candidateFileId } : {}),
              },
            },
          });

          return {
            applicationId: application.id,
            candidateId: candidate.id,
            status: application.status,
          };
        },
        { timeout: 30_000 },
      ),
    );

    if (!created) {
      return {
        applicationId: null,
        candidateId: null,
        status: ApplicationStatus.NEW,
      };
    }

    return created;
  }
}

async function createWithContactRetry<T>(create: () => Promise<T>) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await create();
    } catch (error: unknown) {
      if (isDuplicateApplicationError(error)) {
        return null;
      }

      if (attempt === 0 && isCandidateContactUniqueError(error)) {
        continue;
      }

      throw error;
    }
  }

  return create();
}

async function lockCandidateContacts(tx: Prisma.TransactionClient, normalizedEmail: string, normalizedPhone?: string) {
  const lockKeys = [`candidate-email:${normalizedEmail}`];

  if (normalizedPhone) {
    lockKeys.push(`candidate-phone:${normalizedPhone}`);
  }

  for (const lockKey of lockKeys.sort()) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey})::bigint)`;
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

  const target = getUniqueErrorTarget(error);

  return (
    (target.includes("candidateId") && target.includes("jobId")) ||
    (target.includes("jobId") && target.includes("normalizedEmail")) ||
    (target.includes("jobId") && target.includes("normalizedPhone"))
  );
}

function isCandidateContactUniqueError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const target = getUniqueErrorTarget(error);

  return (
    target.includes("Candidate_normalizedEmail_unique_not_null") ||
    target.includes("Candidate_normalizedPhone_unique_not_null") ||
    (target.includes("Candidate") && target.includes("normalizedEmail")) ||
    (target.includes("Candidate") && target.includes("normalizedPhone"))
  );
}

function getUniqueErrorTarget(error: Prisma.PrismaClientKnownRequestError) {
  const target = error.meta?.target;

  if (Array.isArray(target)) {
    return target.join(",");
  }

  return String(target ?? "");
}
