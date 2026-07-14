import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ApplicationStatus, CvParseStatus, FileKind, JobStatus, Prisma } from "@prisma/client";
import { AiQueueService } from "../ai/ai-queue.service";
import { CvStorageService } from "../files/cv-storage.service";
import { JobsService } from "../jobs/jobs.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateApplicationDto } from "./dto/create-application.dto";

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiQueueService: AiQueueService,
    private readonly cvStorageService: CvStorageService,
    private readonly jobsService: JobsService,
  ) {}

  async createApplication(dto: CreateApplicationDto, cv?: Express.Multer.File) {
    const job = await this.jobsService.getAdminJob(dto.jobId);

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
    const screeningAnswers = buildScreeningAnswerSnapshots(job.questions, dto.questionAnswers ?? []);

    let storedCvPath: string | undefined;
    let created: CreatedApplication | null;

    try {
      created = await createWithContactRetry<CreatedApplication>(async () =>
        this.prisma.$transaction(
          async tx => {
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
                  screeningAnswers,
                },
                consentAccepted: dto.consentAccepted,
              },
            });

            let candidateFileId: string | undefined;

            if (cv) {
              const storedCv = await this.cvStorageService.storeCandidateCv(cv, candidate.id, application.id);
              storedCvPath = storedCv.path;

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
                status: cv ? CvParseStatus.PENDING : CvParseStatus.FAILED,
                summary: cv ? "Hồ sơ đang được Qwen phân tích và đối chiếu với yêu cầu công việc." : "AI matching cần CV được tải lên; liên kết bên ngoài không được tự động truy cập.",
                errorMessage: cv ? undefined : "Uploaded CV file is required for AI matching",
                structuredData: {
                  source: cv ? "ai_match_pending" : "external_link_not_processed",
                  cvSource: cv ? "uploaded_file" : "external_link",
                  fileName: cv?.originalname ?? submittedPortfolioUrl ?? "candidate-provided-link",
                },
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
              candidateFileId,
              status: application.status,
            };
          },
          { timeout: 30_000 },
        ),
      );
    } catch (error) {
      if (storedCvPath) {
        await this.cvStorageService.deleteCandidateCv(storedCvPath).catch(() => {
          this.logger.error("Failed to clean up a CV after application persistence failed");
        });
      }

      throw error;
    }

    if (!created) {
      return {
        applicationId: null,
        candidateId: null,
        status: ApplicationStatus.NEW,
      };
    }

    const { candidateFileId, ...response } = created;

    if (candidateFileId) {
      let aiUnavailableReason: string | undefined;

      try {
        const queued = await this.aiQueueService.enqueue(created.applicationId);

        if (!queued) {
          aiUnavailableReason = "AI matching is disabled in this environment";
        }
      } catch {
        aiUnavailableReason = "AI matching queue is unavailable";
      }

      if (aiUnavailableReason) {
        await this.markAiUnavailable(created.applicationId, aiUnavailableReason).catch(() => {
          this.logger.error("Failed to persist AI unavailability after accepting an application");
        });
      }
    }

    return response;
  }

  private async markAiUnavailable(applicationId: string, errorMessage: string) {
    await this.prisma.cvParseResult.update({
      where: { applicationId },
      data: {
        status: CvParseStatus.FAILED,
        summary: "Không thể bắt đầu phân tích AI. HR vẫn có thể xem CV và đánh giá thủ công.",
        errorMessage,
      },
    });
  }
}

type CreatedApplication = {
  applicationId: string;
  candidateId: string;
  candidateFileId?: string;
  status: ApplicationStatus;
};

type JobQuestion = {
  id: string;
  label: string;
  required: boolean;
  sortOrder: number;
};

type QuestionAnswerInput = {
  questionId: string;
  answer?: string;
};

function buildScreeningAnswerSnapshots(questions: JobQuestion[], answers: QuestionAnswerInput[]) {
  const questionsById = new Map(questions.map(question => [question.id, question]));
  const answerByQuestionId = new Map<string, string>();

  for (const answer of answers) {
    if (!questionsById.has(answer.questionId)) {
      throw new BadRequestException("Screening answer does not belong to this job");
    }

    answerByQuestionId.set(answer.questionId, answer.answer?.trim() ?? "");
  }

  const missingRequiredQuestion = questions.find(question => {
    const answer = answerByQuestionId.get(question.id)?.trim() ?? "";
    return question.required && !answer;
  });

  if (missingRequiredQuestion) {
    throw new BadRequestException(`Required screening question is missing: ${missingRequiredQuestion.label}`);
  }

  return questions.map(question => ({
    questionId: question.id,
    question: question.label,
    q: question.label,
    required: question.required,
    sortOrder: question.sortOrder,
    answer: answerByQuestionId.get(question.id)?.trim() ?? "",
    a: answerByQuestionId.get(question.id)?.trim() ?? "",
  }));
}

async function createWithContactRetry<T>(create: () => Promise<T>) {
  let lastContactConflict: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await create();
    } catch (error: unknown) {
      if (isDuplicateApplicationError(error)) {
        return null;
      }

      if (attempt === 0 && isCandidateContactUniqueError(error)) {
        lastContactConflict = error;
        continue;
      }

      throw error;
    }
  }

  throw lastContactConflict ?? new Error("Application creation retry exited unexpectedly");
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
    (target.includes("candidateId") && target.includes("jobId")) || (target.includes("jobId") && target.includes("normalizedEmail")) || (target.includes("jobId") && target.includes("normalizedPhone"))
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
