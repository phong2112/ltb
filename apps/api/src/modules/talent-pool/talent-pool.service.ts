import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApplicationStatus, CvParseStatus, FileKind, Prisma, TalentPoolSource } from "@prisma/client";
import type { TalentPoolUploadResult } from "@hr-copilot/shared";
import { AiQueueService } from "@/modules/ai/queue/index.service";
import { TalentPoolJobBus, type TalentPoolExtractedPayload } from "@/modules/ai/talent-pool-job-bus.service";
import { TalentPoolProcessingService } from "@/modules/ai/talent-pool/index.service";
import type { AuthUser } from "@/modules/auth";
import { normalizeEmail, normalizeLinkedinUrl, normalizePhone } from "@/modules/candidates/contact";
import { CvStorageService } from "@/modules/files/storage/index.service";
import { hasAllowedFileSignature } from "@/modules/files/signature";
import { JobsService } from "@/modules/jobs/service/index.service";
import { PrismaService } from "@/modules/prisma";
import { TALENT_POOL_ACTIVITY, TALENT_POOL_CANDIDATE_SOURCE, TALENT_POOL_PENDING_NAME } from "./talent-pool.constants";
import { ListTalentPoolDto } from "./dto/list-talent-pool.dto";
import { UpdateTalentPoolEntryDto } from "./dto/update-talent-pool.dto";
import { mergeStructuredData, resolveStructuredData } from "./helpers/structured-data.helpers";

type UploadOptions = {
  targetJobId?: string;
  uploadedBy?: AuthUser;
};

@Injectable()
export class TalentPoolService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TalentPoolService.name);
  private readonly maxFileSizeMb: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cvStorageService: CvStorageService,
    private readonly configService: ConfigService,
    private readonly aiQueueService: AiQueueService,
    private readonly poolProcessingService: TalentPoolProcessingService,
    private readonly jobsService: JobsService,
    private readonly jobBus: TalentPoolJobBus,
  ) {
    this.maxFileSizeMb = configService.get<number>("MAX_CV_FILE_SIZE_MB") ?? 10;
  }

  onModuleInit() {
    this.jobBus.on(TalentPoolJobBus.EXTRACTED, async (payload: TalentPoolExtractedPayload) => {
      try {
        await this.promote(payload.entryId, payload.targetJobId, { allowExisting: true });
      } catch (error) {
        this.logger.error(
          `Auto-promote failed for entry ${payload.entryId} → job ${payload.targetJobId}: ${error instanceof Error ? error.message : "unknown"}`,
        );
      }
    });
  }

  onModuleDestroy() {
    this.jobBus.removeAllListeners(TalentPoolJobBus.EXTRACTED);
  }

  /** Accepts one or more CV files, stores each, and enqueues AI processing. Returns a per-file result. */
  async uploadMany(files: Express.Multer.File[], options: UploadOptions): Promise<TalentPoolUploadResult[]> {
    if (!files.length) {
      throw new BadRequestException("Vui lòng chọn ít nhất một tệp CV.");
    }

    const uploadedByUserId = await this.resolveUploadedByUserId(options.uploadedBy);
    const results: TalentPoolUploadResult[] = [];

    for (const file of files) {
      try {
        this.validateUploadFile(file);
        const entryId = await this.createEntryFromFile(file, uploadedByUserId);
        results.push({ fileName: file.originalname, status: "created", entryId });
        await this.startProcessing(entryId, options.targetJobId);
      } catch (error) {
        this.logger.error(
          `Failed to add "${file.originalname}" to the talent pool: ${error instanceof Error ? error.message : "unknown error"}`,
        );
        results.push({
          fileName: file.originalname,
          status: "error",
          reason: error instanceof BadRequestException ? error.message : "Không thể lưu tệp CV này.",
        });
      }
    }

    return results;
  }

  /** Triggers AI-driven CV text extraction and profile parsing for a single pool entry. */
  async processEntry(entryId: string): Promise<void> {
    return this.poolProcessingService.processPoolEntry(entryId);
  }

  /** Re-runs CV extraction and AI summary after an HR review request. */
  async retryAiVerification(entryId: string) {
    const entry = await this.prisma.talentPoolEntry.findUnique({
      where: { id: entryId },
      select: { id: true, candidateId: true, file: { select: { id: true } } },
    });

    if (!entry) throw new NotFoundException("Không tìm thấy hồ sơ trong kho ứng viên.");
    if (!entry.file) throw new BadRequestException("Hồ sơ không có tệp CV để AI đọc lại.");

    await this.prisma.$transaction([
      this.prisma.talentPoolEntry.update({
        where: { id: entryId },
        data: {
          status: CvParseStatus.PENDING,
          errorMessage: null,
          summary: "HR đã yêu cầu AI đọc lại CV và xác minh tóm tắt.",
        },
      }),
      this.prisma.activityLog.create({
        data: {
          candidateId: entry.candidateId,
          actor: "admin",
          action: "talent_pool_ai_verification_requested",
          metadata: { talentPoolEntryId: entryId },
        },
      }),
    ]);

    await this.startProcessing(entryId, undefined, { force: true });
    return this.getEntry(entryId);
  }

  /** Returns a paginated, optionally filtered list of talent pool entries. */
  async list(query: ListTalentPoolDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const search = query.search?.trim();

    const where: Prisma.TalentPoolEntryWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.tag ? { tags: { has: query.tag } } : {}),
      ...(search
        ? {
            OR: [
              { candidate: { fullName: { contains: search, mode: "insensitive" } } },
              { candidate: { email: { contains: search, mode: "insensitive" } } },
              { candidate: { phone: { contains: search } } },
              { structuredData: { path: ["email"], string_contains: search } },
              { structuredData: { path: ["phone"], string_contains: search } },
            ],
          }
        : {}),
    };

    const [total, entries] = await this.prisma.$transaction([
      this.prisma.talentPoolEntry.count({ where }),
      this.prisma.talentPoolEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          candidate: { select: { id: true, fullName: true, email: true, phone: true } },
          file: { select: { id: true, originalName: true, mimeType: true } },
        },
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      items: entries.map(entry => {
        const structuredData = resolveStructuredData(entry.structuredData, entry.extractedText);
        return {
          id: entry.id,
          status: entry.status,
          candidate: entry.candidate,
          fileId: entry.file?.id ?? null,
          tags: entry.tags,
          summary: entry.summary,
          structuredData,
          promotedApplicationId: entry.promotedApplicationId,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        };
      }),
    };
  }

  /** Returns the full detail view of a single pool entry, throwing 404 if not found. */
  async getEntry(id: string) {
    const entry = await this.prisma.talentPoolEntry.findUnique({
      where: { id },
      include: {
        candidate: true,
        file: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } },
      },
    });

    if (!entry) {
      throw new NotFoundException("Không tìm thấy hồ sơ trong kho ứng viên.");
    }

    const structuredData = resolveStructuredData(entry.structuredData, entry.extractedText);
    return {
      ...entry,
      candidate: entry.candidate,
      structuredData,
    };
  }

  /** Applies editable profile field changes (contact info, tags, notes) and persists them. */
  async updateEntry(id: string, dto: UpdateTalentPoolEntryDto) {
    const entry = await this.getEntry(id);
    const structuredData = mergeStructuredData(entry.structuredData as Prisma.JsonValue | null, {
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone, normalizedPhone: normalizePhone(dto.phone) } : {}),
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.skills !== undefined ? { skills: dto.skills } : {}),
    });

    try {
      await this.prisma.$transaction(async tx => {
        await tx.talentPoolEntry.update({
          where: { id },
          data: {
            structuredData,
            ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
            ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
          },
        });

        if (dto.fullName !== undefined || dto.email !== undefined || dto.phone !== undefined) {
          const email = dto.email?.trim() || null;
          const phone = dto.phone?.trim() || null;
          await tx.candidate.update({
            where: { id: entry.candidateId },
            data: {
              ...(dto.fullName?.trim() ? { fullName: dto.fullName.trim() } : {}),
              ...(dto.email !== undefined ? { email, normalizedEmail: email ? normalizeEmail(email) : null } : {}),
              ...(dto.phone !== undefined ? { phone, normalizedPhone: normalizePhone(phone ?? undefined) ?? null } : {}),
            },
          });
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException("Email hoặc số điện thoại đã thuộc một hồ sơ ứng viên khác.");
      }
      throw error;
    }

    return this.getEntry(id);
  }

  /** Converts a pool entry into a job application, then enqueues AI matching for it. */
  async promote(id: string, jobId: string, { allowExisting = false }: { allowExisting?: boolean } = {}) {
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
    const linkedinUrl = typeof data.linkedinUrl === "string" ? data.linkedinUrl : entry.candidate.linkedinUrl ?? undefined;
    const normalizedLinkedinUrl = normalizeLinkedinUrl(linkedinUrl);

    if (!normalizedEmail && !normalizedPhone && !normalizedLinkedinUrl) {
      throw new BadRequestException("Cần email, số điện thoại hoặc LinkedIn của ứng viên trước khi gán vào vị trí. Hãy bổ sung ở hồ sơ.");
    }

    const fullFile = await this.prisma.candidateFile.findUniqueOrThrow({ where: { id: entry.file.id } });

    let result: { applicationId: string; jobId: string };
    try {
      result = await this.prisma.$transaction(async tx => {
        const application = await tx.application.create({
          data: {
            candidateId: entry.candidateId,
            jobId: job.id,
            submittedFullName: entry.candidate.fullName,
            submittedEmail: email,
            submittedPhone: phone,
            submittedLinkedinUrl: linkedinUrl,
            normalizedEmail,
            normalizedPhone,
            normalizedLinkedinUrl,
            status: ApplicationStatus.VIEWED,
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

    let unavailableReason: string | undefined;
    try {
      const queued = await this.aiQueueService.enqueue(result.applicationId);
      if (!queued) unavailableReason = "AI matching is disabled in this environment";
    } catch {
      unavailableReason = "AI matching queue is unavailable";
    }

    if (unavailableReason) {
      await this.prisma.cvParseResult.update({
        where: { applicationId: result.applicationId },
        data: {
          status: CvParseStatus.FAILED,
          summary: "Không thể bắt đầu phân tích AI. HR vẫn có thể xem CV và đánh giá thủ công.",
          errorMessage: unavailableReason,
        },
      });
    }

    return result;
  }

  /** Removes the pool entry and its associated file rows; deletes the physical CV object if no other row references it. */
  async deleteEntry(id: string) {
    const entry = await this.getEntry(id);
    const filePath = entry.file
      ? (await this.prisma.candidateFile.findFirst({ where: { talentPoolEntryId: id }, select: { path: true } }))?.path
      : undefined;

    await this.prisma.$transaction(async tx => {
      await tx.candidateFile.deleteMany({ where: { talentPoolEntryId: id } });
      await tx.talentPoolEntry.delete({ where: { id } });
    });

    // Only remove the physical object if no other file row still points at the same stored path.
    if (filePath) {
      const stillUsed = await this.prisma.candidateFile.count({ where: { path: filePath } });
      if (stillUsed === 0) {
        await this.cvStorageService.deleteCandidateCv(filePath).catch(() => {
          this.logger.error("Failed to delete a pool CV object during entry removal");
        });
      }
    }

    return { id };
  }

  private async createEntryFromFile(file: Express.Multer.File, uploadedByUserId?: string): Promise<string> {
    let storedPath: string | undefined;

    try {
      return await this.prisma.$transaction(async tx => {
        const candidate = await tx.candidate.create({
          data: { fullName: TALENT_POOL_PENDING_NAME, source: TALENT_POOL_CANDIDATE_SOURCE },
        });

        const entry = await tx.talentPoolEntry.create({
          data: {
            candidateId: candidate.id,
            status: CvParseStatus.PENDING,
            source: TalentPoolSource.TA_UPLOAD,
            uploadedByUserId,
            summary: "CV đã được tiếp nhận và đang chờ trích xuất nội dung.",
          },
        });

        const stored = await this.cvStorageService.storePoolCv(file, candidate.id, entry.id);
        storedPath = stored.path;

        await tx.candidateFile.create({
          data: {
            talentPoolEntryId: entry.id,
            kind: FileKind.CV,
            originalName: stored.originalName,
            storedName: stored.storedName,
            mimeType: stored.mimeType,
            sizeBytes: stored.sizeBytes,
            path: stored.path,
          },
        });

        await tx.activityLog.create({
          data: {
            candidateId: candidate.id,
            actor: "admin",
            action: TALENT_POOL_ACTIVITY.UPLOADED,
            metadata: { talentPoolEntryId: entry.id, fileName: stored.originalName },
          },
        });

        return entry.id;
      }, { timeout: 30_000 });
    } catch (error) {
      if (storedPath) {
        await this.cvStorageService.deleteCandidateCv(storedPath).catch(() => {
          this.logger.error("Failed to clean up a pool CV after persistence failed");
        });
      }
      throw error;
    }
  }

  private validateUploadFile(file: Express.Multer.File): void {
    if (file.size > this.maxFileSizeMb * 1024 * 1024) {
      throw new BadRequestException(`Tệp "${file.originalname}" vượt quá ${this.maxFileSizeMb} MB.`);
    }
    if (!hasAllowedFileSignature(file)) {
      throw new BadRequestException(
        `Nội dung tệp "${file.originalname}" không đúng định dạng PDF, DOC, DOCX, JPG hoặc PNG.`,
      );
    }
  }

  private async startProcessing(entryId: string, targetJobId?: string, options: { force?: boolean } = {}): Promise<void> {
    try {
      const queued = options.force
        ? await this.aiQueueService.enqueuePoolEntry(entryId, targetJobId, options)
        : await this.aiQueueService.enqueuePoolEntry(entryId, targetJobId);
      if (queued) return;
    } catch (error) {
      this.logger.error(
        `Talent pool queue unavailable for ${entryId}; processing inline: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }

    try {
      await this.poolProcessingService.processPoolEntry(entryId);
      if (targetJobId) await this.promote(entryId, targetJobId);
    } catch (error) {
      this.logger.error(
        `Talent pool processing failed for ${entryId}: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  private async resolveUploadedByUserId(user?: AuthUser): Promise<string | undefined> {
    if (!user?.email) return undefined;
    const uploader = await this.prisma.user.upsert({
      where: { email: user.email.trim().toLowerCase() },
      update: { name: user.name },
      create: { email: user.email.trim().toLowerCase(), name: user.name },
      select: { id: true },
    });
    return uploader.id;
  }
}
