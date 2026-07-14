import type { CvStorageService } from "../files/cv-storage.service";
import type { JobsService } from "../jobs/jobs.service";
import type { PrismaService } from "../prisma/prisma.service";
import { ApplicationsService } from "./applications.service";

describe("ApplicationsService", () => {
  it("removes a stored CV when the database transaction rolls back", async () => {
    const transactionClient = {
      $executeRaw: jest.fn(),
      candidate: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: "candidate-1" }),
      },
      application: {
        create: jest.fn().mockResolvedValue({
          id: "application-1",
          status: "NEW",
        }),
      },
      candidateFile: {
        create: jest.fn().mockResolvedValue({ id: "file-1" }),
      },
      activityLog: {
        create: jest.fn().mockRejectedValue(new Error("Database write failed")),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (tx: typeof transactionClient) => unknown) =>
          callback(transactionClient),
      ),
    };
    const deleteCandidateCv = jest.fn().mockResolvedValue(undefined);
    const storage = {
      storeCandidateCv: jest.fn().mockResolvedValue({
        originalName: "candidate.pdf",
        storedName: "candidate.pdf",
        mimeType: "application/pdf",
        sizeBytes: 4,
        path: "cv/candidate-1/application-1/candidate.pdf",
      }),
      deleteCandidateCv,
    };
    const jobs = {
      getAdminJob: jest.fn().mockResolvedValue({
        id: "job-1",
        title: "Frontend Engineer",
        status: "PUBLISHED",
        locations: ["Hà Nội"],
        questions: [],
      }),
    };
    const service = new ApplicationsService(
      prisma as unknown as PrismaService,
      storage as unknown as CvStorageService,
      jobs as unknown as JobsService,
    );
    const file = {
      originalname: "candidate.pdf",
      mimetype: "application/pdf",
      size: 4,
      buffer: Buffer.from("%PDF"),
    } as Express.Multer.File;

    await expect(
      service.createApplication(
        {
          jobId: "job-1",
          fullName: "Candidate",
          email: "candidate@example.com",
          phone: "0901234567",
          applicationArea: "Hà Nội",
          consentAccepted: true,
        },
        file,
      ),
    ).rejects.toThrow("Database write failed");

    expect(deleteCandidateCv).toHaveBeenCalledWith(
      "cv/candidate-1/application-1/candidate.pdf",
    );
  });

  it("rejects an application area that is not configured on the job", async () => {
    const prisma = { $transaction: jest.fn() };
    const storage = { storeCandidateCv: jest.fn() };
    const jobs = {
      getAdminJob: jest.fn().mockResolvedValue({
        id: "job-1",
        title: "Frontend Engineer",
        status: "PUBLISHED",
        locations: ["Hà Nội"],
        questions: [],
      }),
    };
    const service = new ApplicationsService(
      prisma as unknown as PrismaService,
      storage as unknown as CvStorageService,
      jobs as unknown as JobsService,
    );

    await expect(
      service.createApplication({
        jobId: "job-1",
        fullName: "Candidate",
        email: "candidate@example.com",
        phone: "0901234567",
        applicationArea: "TP Hồ Chí Minh",
        consentAccepted: true,
      }),
    ).rejects.toThrow("Application area must be one of the job locations");

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(storage.storeCandidateCv).not.toHaveBeenCalled();
  });
});
