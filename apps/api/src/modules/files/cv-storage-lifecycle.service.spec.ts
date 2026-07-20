import { FileStorageTier } from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";
import { CvStorageLifecycleService } from "./cv-storage-lifecycle.service";
import type { CvStorageService } from "./cv-storage.service";

const candidateFile = {
  id: "file-1",
  applicationId: "application-1",
  kind: "CV",
  storageTier: FileStorageTier.PRIMARY,
  originalName: "candidate.pdf",
  storedName: "cv/candidate-1/application-1/candidate.pdf",
  mimeType: "application/pdf",
  sizeBytes: 4,
  path: "r2://candidate-cvs/cv/candidate-1/application-1/candidate.pdf",
  archivedAt: null,
  createdAt: new Date("2026-07-20T00:00:00.000Z"),
  application: { candidateId: "candidate-1" },
};

describe("CvStorageLifecycleService", () => {
  it("moves primary CVs to Vercel Blob when a job is archived", async () => {
    const candidateFileUpdate = jest.fn().mockResolvedValue({});
    const activityCreate = jest.fn().mockResolvedValue({});
    const transactionClient = {
      candidateFile: { update: candidateFileUpdate },
      activityLog: { create: activityCreate },
    };
    const prisma = {
      candidateFile: { findMany: jest.fn().mockResolvedValue([candidateFile]) },
      $transaction: jest.fn((callback: (tx: typeof transactionClient) => unknown) => callback(transactionClient)),
    };
    const storage = {
      archiveCandidateCv: jest.fn().mockResolvedValue({
        storedName: "archive/cv/candidate-1/application-1/candidate.pdf",
        path: "archive/cv/candidate-1/application-1/candidate.pdf",
      }),
      restoreCandidateCv: jest.fn(),
      deleteCandidateCv: jest.fn().mockResolvedValue(undefined),
    };
    const service = new CvStorageLifecycleService(
      prisma as unknown as PrismaService,
      storage as unknown as CvStorageService,
    );

    await service.archiveJobCandidateFiles("job-1");

    expect(prisma.candidateFile.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        storageTier: FileStorageTier.PRIMARY,
        application: { jobId: "job-1" },
      },
    }));
    expect(candidateFileUpdate).toHaveBeenCalledWith({
      where: { id: "file-1" },
      data: expect.objectContaining({
        storageTier: FileStorageTier.ARCHIVE,
        archivedAt: expect.any(Date),
        path: "archive/cv/candidate-1/application-1/candidate.pdf",
      }),
    });
    expect(activityCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "candidate_file_archived" }),
    }));
    expect(storage.deleteCandidateCv).toHaveBeenCalledWith(candidateFile.path);
  });

  it("moves archived CVs back to R2 when a job is restored", async () => {
    const archivedFile = {
      ...candidateFile,
      storageTier: FileStorageTier.ARCHIVE,
      path: "archive/cv/candidate-1/application-1/candidate.pdf",
      archivedAt: new Date("2026-07-20T01:00:00.000Z"),
    };
    const candidateFileUpdate = jest.fn().mockResolvedValue({});
    const transactionClient = {
      candidateFile: { update: candidateFileUpdate },
      activityLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      candidateFile: { findMany: jest.fn().mockResolvedValue([archivedFile]) },
      $transaction: jest.fn((callback: (tx: typeof transactionClient) => unknown) => callback(transactionClient)),
    };
    const storage = {
      archiveCandidateCv: jest.fn(),
      restoreCandidateCv: jest.fn().mockResolvedValue({
        storedName: "cv/candidate-1/application-1/candidate.pdf",
        path: "r2://candidate-cvs/cv/candidate-1/application-1/candidate.pdf",
      }),
      deleteCandidateCv: jest.fn().mockResolvedValue(undefined),
    };
    const service = new CvStorageLifecycleService(
      prisma as unknown as PrismaService,
      storage as unknown as CvStorageService,
    );

    await service.restoreJobCandidateFiles("job-1");

    expect(candidateFileUpdate).toHaveBeenCalledWith({
      where: { id: "file-1" },
      data: expect.objectContaining({
        storageTier: FileStorageTier.PRIMARY,
        archivedAt: null,
        path: "r2://candidate-cvs/cv/candidate-1/application-1/candidate.pdf",
      }),
    });
    expect(storage.deleteCandidateCv).toHaveBeenCalledWith(archivedFile.path);
  });
});
