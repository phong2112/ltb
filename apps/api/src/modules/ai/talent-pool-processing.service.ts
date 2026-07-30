import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ApplicationStatus, CvParseStatus, FileKind, Prisma } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { lockCandidateContacts, normalizeEmail, normalizePhone } from "../candidates/candidate-contact.util";
import { JobsService } from "../jobs/jobs.service";
import { PrismaService } from "../prisma/prisma.service";
import { parseCvProfileFromText } from "./parse-cv-profile";
import { AI_PROVIDER, type AiProvider } from "./ai.types";
import { CvTextExtractorService } from "./cv-text-extractor.service";
import { prepareCvTextForAi } from "./cv-text-cleaner";

const EXTRACTION_VERSION = "talent-pool-extraction-v2";
const MAX_AI_CV_CHARACTERS = 45_000;

@Injectable()
export class TalentPoolProcessingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly textExtractor: CvTextExtractorService,
    private readonly jobsService: JobsService,
    private readonly configService: ConfigService,
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
  ) {}

  private get aiEnabled() {
    return (this.configService.get<string>("AI_PROVIDER") ?? "disabled") === "groq";
  }

  async processPoolEntry(entryId: string): Promise<void> {
    const entry = await this.prisma.talentPoolEntry.findUnique({
      where: { id: entryId },
      include: { file: true, candidate: true },
    });

    if (!entry?.file) {
      throw new Error("Talent pool entry or CV file not found");
    }

    await this.prisma.talentPoolEntry.update({
      where: { id: entryId },
      data: { status: CvParseStatus.EXTRACTING, errorMessage: null },
    });

    try {
      const extracted = await this.textExtractor.extract({
        originalName: entry.file.originalName,
        mimeType: entry.file.mimeType,
        path: entry.file.path,
      });
      const regex = parseCvProfileFromText(extracted.text);
      const structuredData: Record<string, unknown> = {
        source: "ta_upload",
        parser: extracted.parser,
        extractionVersion: EXTRACTION_VERSION,
        qualityScore: extracted.qualityScore,
        ...(extracted.ocrConfidence === undefined ? {} : { ocrConfidence: extracted.ocrConfidence }),
        ...(extracted.lowConfidenceOcr ? { lowConfidenceOcr: true } : {}),
        ...(extracted.ocrTruncated ? { ocrTruncated: true } : {}),
        ...(extracted.totalPages === undefined ? {} : { totalPages: extracted.totalPages }),
        ...(regex.email ? { email: regex.email } : {}),
        ...(regex.phone ? { phone: regex.phone } : {}),
        ...(regex.normalizedPhone ? { normalizedPhone: regex.normalizedPhone } : {}),
        ...(regex.fullName ? { fullName: regex.fullName, fullNameSource: "cv_text" } : {}),
        ...(regex.title ? { title: regex.title, titleSource: "cv_text" } : {}),
        ...(regex.skills?.length ? { skills: regex.skills, skillsSource: "cv_text" } : {}),
        ...(regex.linkedinUrl ? { linkedinUrl: regex.linkedinUrl } : {}),
        ...(regex.portfolioUrl ? { portfolioUrl: regex.portfolioUrl } : {}),
      };

      let extractedFullName = regex.fullName;
      if (this.aiEnabled) {
        try {
          const aiReadyCv = prepareCvTextForAi(extracted.text, MAX_AI_CV_CHARACTERS);
          const profile = await this.aiProvider.extractProfile({
            cvText: aiReadyCv.text,
            fileName: entry.file.originalName,
          });
          structuredData.aiInput = {
            sourceCharacters: aiReadyCv.sourceCharacters,
            cleanedCharacters: aiReadyCv.cleanedCharacters,
            redactionCount: aiReadyCv.redactionCount,
            truncated: aiReadyCv.truncated,
          };
          if (profile.fullName?.trim()) {
            extractedFullName = profile.fullName.trim();
            structuredData.fullName = extractedFullName;
            structuredData.fullNameSource = "ai";
          }
          if (profile.title?.trim()) {
            structuredData.title = profile.title.trim();
            structuredData.titleSource = "ai";
          }
          if (profile.yearsExperience !== null) structuredData.yearsExperience = profile.yearsExperience;
          if (profile.skills.length) {
            structuredData.skills = profile.skills;
            structuredData.skillsSource = "ai";
          }
          if (profile.languages.length) structuredData.languages = profile.languages;
          structuredData.aiEnriched = true;
        } catch {
          structuredData.aiEnriched = false;
        }
      }

      await this.prisma.$transaction(async tx => {
        const candidateId = await this.resolveCandidate(tx, {
          currentCandidate: entry.candidate,
          email: regex.email,
          phone: regex.phone,
          linkedinUrl: regex.linkedinUrl,
          portfolioUrl: regex.portfolioUrl,
          fullName: extractedFullName,
        });

        await tx.talentPoolEntry.update({
          where: { id: entryId },
          data: {
            candidateId,
            status: CvParseStatus.COMPLETED,
            extractedText: extracted.text,
            structuredData: structuredData as Prisma.InputJsonObject,
            summary: "Đã trích xuất nội dung CV. Bổ sung tên/kỹ năng nếu cần.",
            errorMessage: null,
          },
        });

        if (candidateId !== entry.candidateId) {
          await tx.activityLog.updateMany({
            where: { candidateId: entry.candidateId },
            data: { candidateId },
          });
          await tx.candidate.delete({ where: { id: entry.candidateId } });
        }
      });
    } catch (error) {
      await this.markPoolFailed(entryId, error);
      throw error;
    }
  }

  async promotePoolEntry(id: string, jobId: string, allowExisting = false) {
    const entry = await this.prisma.talentPoolEntry.findUnique({
      where: { id },
      include: {
        candidate: true,
        file: { select: { id: true } },
        promotedApplication: { select: { jobId: true } },
      },
    });

    if (!entry) throw new NotFoundException("Không tìm thấy hồ sơ trong kho ứng viên.");
    if (entry.promotedApplicationId) {
      if (allowExisting && entry.promotedApplication?.jobId === jobId) {
        return { applicationId: entry.promotedApplicationId, jobId };
      }
      throw new ConflictException("Hồ sơ này đã được gán vào một vị trí tuyển dụng.");
    }
    if (!entry.file) {
      throw new BadRequestException("Hồ sơ không có tệp CV để gán vào vị trí tuyển dụng.");
    }

    const job = await this.jobsService.getAdminJob(jobId);
    const data = (entry.structuredData ?? {}) as Record<string, unknown>;
    const email = typeof data.email === "string" ? data.email : entry.candidate.email ?? undefined;
    const phone = typeof data.phone === "string" ? data.phone : entry.candidate.phone ?? undefined;
    const normalizedEmail = email ? normalizeEmail(email) : undefined;
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedEmail && !normalizedPhone) {
      throw new BadRequestException("Cần email hoặc số điện thoại của ứng viên trước khi gán vào vị trí. Hãy bổ sung ở hồ sơ.");
    }

    const fullFile = await this.prisma.candidateFile.findUniqueOrThrow({ where: { id: entry.file.id } });

    try {
      return await this.prisma.$transaction(async tx => {
        const application = await tx.application.create({
          data: {
            candidateId: entry.candidateId,
            jobId: job.id,
            submittedFullName: entry.candidate.fullName,
            submittedEmail: email,
            submittedPhone: phone,
            normalizedEmail,
            normalizedPhone,
            status: ApplicationStatus.REVIEWING,
            consentAccepted: false,
            answers: { source: "talent_pool", talentPoolEntryId: entry.id },
          },
        });
        const applicationFile = await tx.candidateFile.create({
          data: {
            applicationId: application.id,
            kind: FileKind.CV,
            storageTier: fullFile.storageTier,
            originalName: fullFile.originalName,
            storedName: fullFile.storedName,
            mimeType: fullFile.mimeType,
            sizeBytes: fullFile.sizeBytes,
            path: fullFile.path,
          },
        });
        await tx.cvParseResult.create({
          data: {
            applicationId: application.id,
            candidateFileId: applicationFile.id,
            status: entry.extractedText ? CvParseStatus.EXTRACTED : CvParseStatus.PENDING,
            extractedText: entry.extractedText,
            structuredData: (entry.structuredData ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            summary: "Hồ sơ được gán từ kho ứng viên; đang chờ phân tích mức độ phù hợp.",
          },
        });
        await tx.talentPoolEntry.update({
          where: { id: entry.id },
          data: { promotedApplicationId: application.id },
        });
        await tx.activityLog.create({
          data: {
            candidateId: entry.candidateId,
            applicationId: application.id,
            jobId: job.id,
            actor: "admin",
            action: "talent_pool_promoted",
            metadata: { talentPoolEntryId: entry.id, jobTitle: job.title },
          },
        });
        return { applicationId: application.id, jobId: job.id };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Ứng viên này đã có hồ sơ ứng tuyển cho vị trí đã chọn.");
      }
      throw error;
    }
  }

  async markAiUnavailable(applicationId: string, errorMessage: string) {
    await this.prisma.cvParseResult.update({
      where: { applicationId },
      data: {
        status: CvParseStatus.FAILED,
        summary: "Không thể bắt đầu phân tích AI. HR vẫn có thể xem CV và đánh giá thủ công.",
        errorMessage,
      },
    });
  }

  async markPoolFailed(entryId: string, error: unknown) {
    await this.prisma.talentPoolEntry.update({
      where: { id: entryId },
      data: {
        status: CvParseStatus.FAILED,
        summary: "Không thể trích xuất nội dung CV tự động. Bạn vẫn có thể xem CV và nhập thông tin thủ công.",
        errorMessage: error instanceof Error ? error.message : "Unknown extraction error",
      },
    });
  }

  private async resolveCandidate(
    tx: Prisma.TransactionClient,
    input: {
      currentCandidate: {
        id: string;
        fullName: string;
        email: string | null;
        normalizedEmail: string | null;
        phone: string | null;
        normalizedPhone: string | null;
        linkedinUrl: string | null;
        portfolioUrl: string | null;
      };
      email?: string;
      phone?: string;
      linkedinUrl?: string;
      portfolioUrl?: string;
      fullName?: string;
    },
  ) {
    const normalizedEmail = input.email ? normalizeEmail(input.email) : undefined;
    const normalizedPhone = normalizePhone(input.phone);
    await lockCandidateContacts(tx, normalizedEmail, normalizedPhone);

    const filters: Prisma.CandidateWhereInput[] = [];
    if (normalizedEmail) filters.push({ normalizedEmail });
    if (normalizedPhone) filters.push({ normalizedPhone });
    const matches = filters.length
      ? await tx.candidate.findMany({
          where: { id: { not: input.currentCandidate.id }, OR: filters },
          orderBy: { createdAt: "asc" },
          take: 2,
        })
      : [];

    if (matches.length > 1 && matches[0].id !== matches[1].id) {
      throw new BadRequestException("Email và số điện thoại đang khớp với hai hồ sơ ứng viên khác nhau.");
    }

    const target = matches[0] ?? input.currentCandidate;
    await tx.candidate.update({
      where: { id: target.id },
      data: {
        ...(!target.email && input.email ? { email: input.email, normalizedEmail } : {}),
        ...(!target.phone && input.phone ? { phone: input.phone, normalizedPhone } : {}),
        ...(!target.linkedinUrl && input.linkedinUrl ? { linkedinUrl: input.linkedinUrl } : {}),
        ...(!target.portfolioUrl && input.portfolioUrl ? { portfolioUrl: input.portfolioUrl } : {}),
        ...(target.id === input.currentCandidate.id && input.fullName ? { fullName: input.fullName } : {}),
      },
    });
    return target.id;
  }
}
