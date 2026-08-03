import { Injectable, Logger } from "@nestjs/common";
import { FileStorageTier, type Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma";
import { CvStorageService, type CvRelocationContext } from "../storage/index.service";

type CandidateFileForRelocation = Prisma.CandidateFileGetPayload<{
  include: {
    application: {
      select: {
        candidateId: true;
      };
    };
  };
}>;

@Injectable()
export class CvStorageLifecycleService {
  private readonly logger = new Logger(CvStorageLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cvStorageService: CvStorageService,
  ) {}

  async archiveJobCandidateFiles(jobId: string) {
    const files = await this.findJobFiles(jobId, FileStorageTier.PRIMARY);

    for (const file of files) {
      await this.relocateFile(file, FileStorageTier.ARCHIVE);
    }
  }

  async restoreJobCandidateFiles(jobId: string) {
    const files = await this.findJobFiles(jobId, FileStorageTier.ARCHIVE);

    for (const file of files) {
      await this.relocateFile(file, FileStorageTier.PRIMARY);
    }
  }

  private findJobFiles(jobId: string, storageTier: FileStorageTier) {
    return this.prisma.candidateFile.findMany({
      where: {
        storageTier,
        application: { jobId },
      },
      include: {
        application: {
          select: { candidateId: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  private async relocateFile(file: CandidateFileForRelocation, targetTier: FileStorageTier) {
    // findJobFiles only selects application-scoped files (filtered by application.jobId),
    // so application is always present here; guard keeps the invariant explicit for the type system.
    if (!file.application || !file.applicationId) {
      throw new Error("Cannot relocate a CandidateFile that has no owning application");
    }

    const candidateId = file.application.candidateId;
    const applicationId = file.applicationId;
    const context: CvRelocationContext = {
      path: file.path,
      storedName: file.storedName,
      originalName: file.originalName,
      mimeType: file.mimeType,
      candidateId,
      applicationId,
    };
    const relocated = targetTier === FileStorageTier.ARCHIVE
      ? await this.cvStorageService.archiveCandidateCv(context)
      : await this.cvStorageService.restoreCandidateCv(context);

    try {
      await this.prisma.$transaction(async tx => {
        await tx.candidateFile.update({
          where: { id: file.id },
          data: {
            storageTier: targetTier,
            archivedAt: targetTier === FileStorageTier.ARCHIVE ? new Date() : null,
            storedName: relocated.storedName,
            path: relocated.path,
          },
        });

        await tx.activityLog.create({
          data: {
            candidateId,
            applicationId,
            candidateFileId: file.id,
            actor: "system",
            action: targetTier === FileStorageTier.ARCHIVE
              ? "candidate_file_archived"
              : "candidate_file_restored",
            metadata: {
              storageTier: targetTier,
            },
          },
        });
      });
    } catch (error: unknown) {
      if (relocated.path !== file.path) {
        await this.cvStorageService.deleteCandidateCv(relocated.path).catch(() => undefined);
      }
      throw error;
    }

    if (relocated.path !== file.path) {
      await this.cvStorageService.deleteCandidateCv(file.path).catch(() => {
        this.logger.warn(`Could not delete source CV after relocating candidate file ${file.id}`);
      });
    }
  }
}
