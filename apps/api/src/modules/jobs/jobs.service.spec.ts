import { JobStatus } from "@prisma/client";
import type { CvStorageLifecycleService } from "../files/cv-storage-lifecycle.service";
import type { PrismaService } from "../prisma/prisma.service";
import { JobsService } from "./jobs.service";

describe("JobsService storage lifecycle", () => {
  it("archives job CV files after the job enters ARCHIVED status", async () => {
    const lifecycle = {
      archiveJobCandidateFiles: jest.fn().mockResolvedValue(undefined),
      restoreJobCandidateFiles: jest.fn().mockResolvedValue(undefined),
    };
    const service = createService(lifecycle);

    await service.updateJob("job-1", { status: JobStatus.ARCHIVED });

    expect(lifecycle.archiveJobCandidateFiles).toHaveBeenCalledWith("job-1");
    expect(lifecycle.restoreJobCandidateFiles).not.toHaveBeenCalled();
  });

  it("restores archived job CV files when the job becomes active again", async () => {
    const lifecycle = {
      archiveJobCandidateFiles: jest.fn().mockResolvedValue(undefined),
      restoreJobCandidateFiles: jest.fn().mockResolvedValue(undefined),
    };
    const service = createService(lifecycle);

    await service.updateJob("job-1", { status: JobStatus.CLOSED });

    expect(lifecycle.restoreJobCandidateFiles).toHaveBeenCalledWith("job-1");
    expect(lifecycle.archiveJobCandidateFiles).not.toHaveBeenCalled();
  });
});

function createService(lifecycle: {
  archiveJobCandidateFiles: jest.Mock;
  restoreJobCandidateFiles: jest.Mock;
}) {
  const transactionClient = {
    job: {
      update: jest.fn().mockResolvedValue({ id: "job-1" }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "job-1" }),
    },
    jobQuestion: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (tx: typeof transactionClient) => unknown) => callback(transactionClient)),
  };
  const service = new JobsService(
    prisma as unknown as PrismaService,
    lifecycle as unknown as CvStorageLifecycleService,
  );
  jest.spyOn(service, "getAdminJob").mockResolvedValue({ id: "job-1" } as never);
  return service;
}
