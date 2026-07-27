import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CvParseStatus, FileKind, Prisma, TalentPoolSource } from "@prisma/client";
import { basename, extname } from "node:path";
import { AiQueueService } from "../ai/ai-queue.service";
import { TalentPoolProcessingService } from "../ai/talent-pool-processing.service";
import type { AuthUser } from "../auth/auth.types";
import { normalizeEmail, normalizePhone } from "../candidates/candidate-contact.util";
import { CvStorageService } from "../files/cv-storage.service";
import { hasAllowedFileSignature } from "../files/file-signature.util";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateTalentPoolEntryDto } from "./dto/update-talent-pool-entry.dto";
import { ListTalentPoolDto } from "./dto/list-talent-pool.dto";

export type TalentPoolUploadResult = {
  fileName: string;
  status: "created" | "error";
  entryId?: string;
  reason?: string;
};

type UploadOptions = {
  targetJobId?: string;
  uploadedBy?: AuthUser;
};

@Injectable()
export class TalentPoolService {
  private readonly logger = new Logger(TalentPoolService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cvStorageService: CvStorageService,
    private readonly configService: ConfigService,
    private readonly aiQueueService: AiQueueService,
    private readonly poolProcessingService: TalentPoolProcessingService,
  ) {}

  async uploadMany(files: Express.Multer.File[], options: UploadOptions): Promise<TalentPoolUploadResult[]> {
    if (!files.length) {
      throw new BadRequestException("Vui lòng chọn ít nhất một tệp CV.");
    }

    const results: TalentPoolUploadResult[] = [];
    const uploadedByUserId = await this.resolveUploadedByUserId(options.uploadedBy);

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

  private async createEntryFromFile(file: Express.Multer.File, uploadedByUserId?: string): Promise<string> {
    const fallbackName = basename(file.originalname, extname(file.originalname)).trim() || "Ứng viên chưa rõ tên";
    let storedPath: string | undefined;

    try {
      return await this.prisma.$transaction(async tx => {
        const candidate = await tx.candidate.create({
          data: { fullName: fallbackName, source: "talent_pool" },
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
            action: "talent_pool_uploaded",
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

  private validateUploadFile(file: Express.Multer.File) {
    const maxSizeMb = this.configService.get<number>("MAX_CV_FILE_SIZE_MB") ?? 10;
    if (file.size > maxSizeMb * 1024 * 1024) {
      throw new BadRequestException(`Tệp "${file.originalname}" vượt quá ${maxSizeMb} MB.`);
    }
    if (!hasAllowedFileSignature(file)) {
      throw new BadRequestException(`Nội dung tệp "${file.originalname}" không đúng định dạng PDF, DOC, DOCX, JPG hoặc PNG.`);
    }
  }

  private async startProcessing(entryId: string, targetJobId?: string) {
    try {
      const queued = await this.aiQueueService.enqueuePoolEntry(entryId, targetJobId);
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

  async processEntry(entryId: string): Promise<void> {
    return this.poolProcessingService.processPoolEntry(entryId);
  }

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
      items: entries.map(entry => ({
        id: entry.id,
        status: entry.status,
        candidate: entry.candidate,
        fileId: entry.file?.id ?? null,
        tags: entry.tags,
        summary: entry.summary,
        structuredData: entry.structuredData,
        promotedApplicationId: entry.promotedApplicationId,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      })),
    };
  }

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

    return entry;
  }

  async updateEntry(id: string, dto: UpdateTalentPoolEntryDto) {
    const entry = await this.getEntry(id);
    const structuredData = mergeStructuredData(entry.structuredData, {
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

  async promote(id: string, jobId: string) {
    const result = await this.poolProcessingService.promotePoolEntry(id, jobId);
    let unavailableReason: string | undefined;
    try {
      const queued = await this.aiQueueService.enqueue(result.applicationId);
      if (!queued) unavailableReason = "AI matching is disabled in this environment";
    } catch {
      unavailableReason = "AI matching queue is unavailable";
    }

    if (unavailableReason) {
      await this.poolProcessingService.markAiUnavailable(result.applicationId, unavailableReason);
    }
    return result;
  }

  async deleteEntry(id: string) {
    const entry = await this.getEntry(id);
    const filePath = entry.file
      ? (await this.prisma.candidateFile.findFirst({ where: { talentPoolEntryId: id }, select: { path: true } }))?.path
      : undefined;

    await this.prisma.$transaction(async tx => {
      await tx.candidateFile.deleteMany({ where: { talentPoolEntryId: id } });
      await tx.talentPoolEntry.delete({ where: { id } });
    });

    // Only remove the physical object if no other file row (e.g. a promoted
    // application's copy) still points at the same stored path.
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

  private async resolveUploadedByUserId(user?: AuthUser) {
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

function mergeStructuredData(
  current: Prisma.JsonValue | null,
  patch: Record<string, unknown>,
): Prisma.InputJsonObject {
  const base = current && typeof current === "object" && !Array.isArray(current)
    ? (current as Record<string, unknown>)
    : {};
  return { ...base, ...patch } as Prisma.InputJsonObject;
}
