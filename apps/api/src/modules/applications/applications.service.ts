import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ApplicationStatus, CvParseStatus, FileKind, JobStatus, Prisma } from "@prisma/client";
import { AiQueueService } from "../ai/ai-queue.service";
import { CvStorageService } from "../files/cv-storage.service";
import { JobsService } from "../jobs/jobs.service";
import { EmailService } from "../notifications/email.service";
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
    private readonly emailService: EmailService,
  ) {}

  async createApplication(dto: CreateApplicationDto, cv?: Express.Multer.File) {
    const job = await this.jobsService.getAdminJob(dto.jobId);

    if (job.status !== JobStatus.PUBLISHED) {
      throw new NotFoundException("Không tìm thấy vị trí tuyển dụng đã công khai.");
    }

    if (!job.locations.includes(dto.applicationArea)) {
      throw new BadRequestException("Khu vực ứng tuyển phải nằm trong danh sách địa điểm của vị trí tuyển dụng.");
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
    let created: CreatedApplication;

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
              throw new BadRequestException("Email và số điện thoại đang khớp với hai hồ sơ ứng viên khác nhau.");
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

            await ensureCandidateHasNotApplied(tx, {
              candidateId: candidate.id,
              jobId: job.id,
              normalizedEmail,
              normalizedPhone,
            });

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

    const { candidateFileId, ...response } = created;

    this.scheduleAcceptedApplicationSideEffects({
      applicationId: created.applicationId,
      candidateFileId,
      candidateEmail,
      candidateName: submittedFullName,
      jobTitle: job.title,
      companyName: job.company,
      jobSlug: job.slug,
      applicationArea: dto.applicationArea,
    });

    return response;
  }

  private scheduleAcceptedApplicationSideEffects(input: AcceptedApplicationSideEffects) {
    void this.runAcceptedApplicationSideEffects(input).catch((error: unknown) => {
      this.logger.error(
        error instanceof Error
          ? `Failed to run accepted application side effects: ${error.message}`
          : "Failed to run accepted application side effects",
      );
    });
  }

  private async runAcceptedApplicationSideEffects(input: AcceptedApplicationSideEffects) {
    const sideEffects = [
      this.emailService
        .sendApplicationConfirmation({
          applicationId: input.applicationId,
          candidateEmail: input.candidateEmail,
          candidateName: input.candidateName,
          jobTitle: input.jobTitle,
          companyName: input.companyName,
          jobSlug: input.jobSlug,
          applicationArea: input.applicationArea,
        })
        .catch((error: unknown) => {
          this.logger.error(
            error instanceof Error
              ? `Failed to send application confirmation email: ${error.message}`
              : "Failed to send application confirmation email",
          );
        }),
    ];

    if (input.candidateFileId) {
      sideEffects.push(this.startAiMatching(input.applicationId));
    }

    await Promise.all(sideEffects);
  }

  private async startAiMatching(applicationId: string) {
    let aiUnavailableReason: string | undefined;

    try {
      const queued = await this.aiQueueService.enqueue(applicationId);

      if (!queued) {
        aiUnavailableReason = "AI matching is disabled in this environment";
      }
    } catch {
      aiUnavailableReason = "AI matching queue is unavailable";
    }

    if (aiUnavailableReason) {
      await this.markAiUnavailable(applicationId, aiUnavailableReason).catch(() => {
        this.logger.error("Failed to persist AI unavailability after accepting an application");
      });
    }
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

type AcceptedApplicationSideEffects = {
  applicationId: string;
  candidateFileId?: string;
  candidateEmail: string;
  candidateName: string;
  jobTitle: string;
  companyName?: string | null;
  jobSlug?: string | null;
  applicationArea: string;
};

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

const DUPLICATE_APPLICATION_MESSAGE = "Bạn đã ứng tuyển vị trí này bằng email hoặc số điện thoại này.";

function buildScreeningAnswerSnapshots(questions: JobQuestion[], answers: QuestionAnswerInput[]) {
  const questionsById = new Map(questions.map(question => [question.id, question]));
  const answerByQuestionId = new Map<string, string>();

  for (const answer of answers) {
    if (!questionsById.has(answer.questionId)) {
      throw new BadRequestException("Câu trả lời sàng lọc không thuộc vị trí tuyển dụng này.");
    }

    answerByQuestionId.set(answer.questionId, answer.answer?.trim() ?? "");
  }

  const missingRequiredQuestion = questions.find(question => {
    const answer = answerByQuestionId.get(question.id)?.trim() ?? "";
    return question.required && !answer;
  });

  if (missingRequiredQuestion) {
    throw new BadRequestException(`Vui lòng trả lời câu hỏi sàng lọc bắt buộc: ${missingRequiredQuestion.label}`);
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
        throw new ConflictException(DUPLICATE_APPLICATION_MESSAGE);
      }

      if (attempt === 0 && isCandidateContactUniqueError(error)) {
        lastContactConflict = error;
        continue;
      }

      throw error;
    }
  }

  throw lastContactConflict ?? new Error("Quá trình tạo hồ sơ ứng tuyển kết thúc ngoài dự kiến.");
}

async function ensureCandidateHasNotApplied(
  tx: Prisma.TransactionClient,
  input: {
    candidateId: string;
    jobId: string;
    normalizedEmail: string;
    normalizedPhone?: string;
  },
) {
  const duplicateFilters: Prisma.ApplicationWhereInput[] = [
    { candidateId: input.candidateId },
    { normalizedEmail: input.normalizedEmail },
  ];

  if (input.normalizedPhone) {
    duplicateFilters.push({ normalizedPhone: input.normalizedPhone });
  }

  const existingApplication = await tx.application.findFirst({
    where: {
      jobId: input.jobId,
      OR: duplicateFilters,
    },
    select: { id: true },
  });

  if (existingApplication) {
    throw new ConflictException(DUPLICATE_APPLICATION_MESSAGE);
  }
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
  if (!isUniqueConstraintError(error)) {
    return false;
  }

  const target = getUniqueErrorTarget(error);

  return (
    (target.includes("candidateId") && target.includes("jobId")) || (target.includes("jobId") && target.includes("normalizedEmail")) || (target.includes("jobId") && target.includes("normalizedPhone"))
  );
}

function isCandidateContactUniqueError(error: unknown) {
  if (!isUniqueConstraintError(error)) {
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

function isUniqueConstraintError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return true;
  }

  const adapterCause = getDriverAdapterCause(error);
  return adapterCause?.originalCode === "23505" || adapterCause?.kind === "UniqueConstraintViolation";
}

function getUniqueErrorTarget(error: unknown) {
  const parts: string[] = [];
  const errorRecord = toRecord(error);
  const meta = toRecord(errorRecord?.meta);
  const target = meta?.target;

  if (Array.isArray(target)) {
    parts.push(target.map(value => String(value)).join(","));
  } else if (target !== undefined) {
    parts.push(String(target));
  }

  const modelName = meta?.modelName;
  if (modelName !== undefined) {
    parts.push(String(modelName));
  }

  const adapterCause = getDriverAdapterCause(error);
  const constraint = toRecord(adapterCause?.constraint);
  const fields = constraint?.fields;

  if (Array.isArray(fields)) {
    parts.push(fields.map(value => String(value).replaceAll("\"", "")).join(","));
  }

  for (const key of ["originalMessage", "kind", "originalCode"]) {
    const value = adapterCause?.[key];
    if (value !== undefined) {
      parts.push(String(value));
    }
  }

  return parts.join(",");
}

function getDriverAdapterCause(error: unknown) {
  const errorRecord = toRecord(error);
  const meta = toRecord(errorRecord?.meta);
  const driverAdapterError = toRecord(meta?.driverAdapterError) ?? toRecord(errorRecord?.driverAdapterError);
  return toRecord(driverAdapterError?.cause) ?? toRecord(errorRecord?.cause);
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}
