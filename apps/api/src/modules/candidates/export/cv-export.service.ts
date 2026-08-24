import archiver from "archiver";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { FileKind, type ApplicationStatus, type Prisma } from "@prisma/client";
import type { Response } from "express";
import { finished } from "node:stream/promises";
import { extname } from "node:path";
import { randomUUID } from "node:crypto";
import { CvStorageService } from "@/modules/files/storage/index.service";
import { PrismaService } from "@/modules/prisma";
import { CreateCvExportDto, CvExportScope } from "@/modules/candidates/dto/export/index.dto";

type ExportFile = {
  id: string;
  path: string;
  mimeType: string;
  originalName: string;
  candidateId: string;
  candidateName: string;
  jobId?: string;
  jobTitle?: string;
  pool: boolean;
};

@Injectable()
export class CvExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: CvStorageService,
  ) {}

  async export(dto: CreateCvExportDto, response: Response) {
    const files = await this.resolveFiles(dto);
    if (!files.length) throw new BadRequestException("Không có CV hợp lệ để xuất.");

    const exportId = randomUUID();
    const filename = await this.buildArchiveName(dto);
    response.set({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });

    const archive = archiver("zip", { zlib: { level: 6 } });
    const failures: string[] = [];
    archive.on("warning", (error: Error) => failures.push(error.message));
    archive.on("error", (error: Error) => response.destroy(error));
    archive.pipe(response);

    const names = new Set<string>();
    const exported: ExportFile[] = [];
    for (const file of files) {
      try {
        const opened = await this.storage.openCandidateCv(file.path, file.mimeType);
        const entryName = uniqueEntryName(file, names);
        archive.append(opened.stream, { name: entryName });
        await finished(opened.stream);
        exported.push(file);
      } catch {
        failures.push(`${file.candidateName}: ${file.originalName}`);
      }
    }

    if (failures.length) {
      archive.append(`Không thể xuất các tệp sau:\n${failures.join("\n")}\n`, { name: "_khong-xuat-duoc.txt" });
    }
    if (exported.length) {
      await this.prisma.activityLog.createMany({
        data: exported.map(file => ({
          candidateId: file.candidateId,
          candidateFileId: file.id,
          jobId: file.jobId,
          actor: "hr",
          action: "candidate_file_exported",
          metadata: { exportId, scope: dto.scope, jobId: file.jobId, fileName: file.originalName },
        })),
      });
    }
    await archive.finalize();
  }

  private async resolveFiles(dto: CreateCvExportDto): Promise<ExportFile[]> {
    const filters = dto.filters;
    let candidateIds: string[] | undefined;
    let poolIds: string[] | undefined;
    if (dto.scope === CvExportScope.JOB) {
      const job = await this.prisma.job.findUnique({ where: { id: dto.jobId }, select: { id: true } });
      if (!job) throw new NotFoundException("Không tìm thấy vị trí tuyển dụng.");
      return this.applicationFiles({ jobId: dto.jobId });
    }
    if (dto.scope === CvExportScope.CANDIDATE) candidateIds = [dto.candidateId!];
    if (dto.scope === CvExportScope.SELECTED) {
      candidateIds = dto.candidateIds ?? [];
      poolIds = dto.talentPoolEntryIds ?? [];
      if (!candidateIds.length && !poolIds.length) throw new BadRequestException("Vui lòng chọn ít nhất một hồ sơ.");
    }
    if (dto.scope === CvExportScope.FILTERED) {
      candidateIds = undefined;
      poolIds = undefined;
    }
    const application = await this.applicationFiles({
      candidateIds,
      jobId: filters?.jobId,
      status: filters?.status,
      q: filters?.q,
      excludeCandidateIds: dto.scope === CvExportScope.FILTERED ? dto.excludedCandidateIds : undefined,
    });
    const pools = await this.poolFiles({
      entryIds: poolIds,
      q: filters?.q,
      include: Boolean(poolIds?.length) || (dto.scope === CvExportScope.FILTERED && !filters?.jobId && (!filters?.status || filters.status === "TALENT_POOL")),
      excludeEntryIds: dto.scope === CvExportScope.FILTERED ? dto.excludedTalentPoolEntryIds : undefined,
    });
    const applicationCandidateIds = new Set(application.map(file => file.candidateId));
    return [...application, ...pools.filter(file => !applicationCandidateIds.has(file.candidateId))];
  }

  private async applicationFiles(input: { candidateIds?: string[]; excludeCandidateIds?: string[]; jobId?: string; status?: ApplicationStatus; q?: string }) {
    const where: Prisma.ApplicationWhereInput = {
      ...(input.candidateIds ? { candidateId: { in: input.candidateIds } } : {}),
      ...(input.excludeCandidateIds?.length ? { candidateId: { notIn: input.excludeCandidateIds } } : {}),
      ...(input.jobId ? { jobId: input.jobId } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.q?.trim() ? { candidate: { OR: [{ fullName: { contains: input.q.trim(), mode: "insensitive" } }, { email: { contains: input.q.trim(), mode: "insensitive" } }] } } : {}),
    };
    const applications = await this.prisma.application.findMany({ where, include: { candidate: true, job: true, files: { where: { kind: FileKind.CV }, orderBy: { createdAt: "desc" } } } });
    return applications.flatMap(application => application.files.map(file => ({ id: file.id, path: file.path, mimeType: file.mimeType, originalName: file.originalName, candidateId: application.candidateId, candidateName: application.submittedFullName || application.candidate.fullName, jobId: application.jobId, jobTitle: application.job.title, pool: false })));
  }

  private async poolFiles(input: { entryIds?: string[]; excludeEntryIds?: string[]; q?: string; include: boolean }) {
    if (!input.include && !input.entryIds?.length) return [];
    const entries = await this.prisma.talentPoolEntry.findMany({
      where: { ...(input.entryIds ? { id: { in: input.entryIds } } : {}), ...(input.excludeEntryIds?.length ? { id: { notIn: input.excludeEntryIds } } : {}), ...(input.q?.trim() ? { candidate: { fullName: { contains: input.q.trim(), mode: "insensitive" } } } : {}) },
      include: { candidate: true, file: true },
    });
    return entries.flatMap(entry => entry.file ? [{ id: entry.file.id, path: entry.file.path, mimeType: entry.file.mimeType, originalName: entry.file.originalName, candidateId: entry.candidateId, candidateName: entry.candidate.fullName, pool: true }] : []);
  }

  private async buildArchiveName(dto: CreateCvExportDto) {
    if (dto.scope !== CvExportScope.JOB) return `cv-ung-vien-${dateStamp()}.zip`;
    const job = await this.prisma.job.findUnique({ where: { id: dto.jobId }, select: { slug: true } });
    return `cv-${safeSegment(job?.slug || "jd")}-${dateStamp()}.zip`;
  }
}

function safeSegment(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "cv";
}
function uniqueEntryName(file: ExportFile, names: Set<string>) {
  const base = `${file.pool ? "Talent-Pool" : safeSegment(file.jobTitle || "JD")}/${safeSegment(file.candidateName)}_${file.candidateId.slice(-8)}/${safeFileName(file.originalName)}`;
  let result = base; let index = 2;
  while (names.has(result)) result = `${base}-${index++}`;
  names.add(result); return result;
}
function dateStamp() { return new Date().toISOString().slice(0, 10).replaceAll("-", ""); }
function safeFileName(value: string) {
  const extension = extname(value).slice(0, 16);
  return `${safeSegment(value.slice(0, Math.max(0, value.length - extension.length)))}${extension.toLowerCase()}`;
}
