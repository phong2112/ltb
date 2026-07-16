jest.mock("../ai/ai-queue.service", () => ({
  AiQueueService: class AiQueueService {},
}));

import type { AiQueueService } from "../ai/ai-queue.service";
import type { CvStorageService } from "../files/cv-storage.service";
import type { JobsService } from "../jobs/jobs.service";
import type { EmailService } from "../notifications/email.service";
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
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: "application-1",
          status: "NEW",
        }),
      },
      candidateFile: {
        create: jest.fn().mockResolvedValue({ id: "file-1" }),
      },
      cvParseResult: { create: jest.fn().mockResolvedValue({}) },
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
    const email = { sendApplicationConfirmation: jest.fn() };
    const service = new ApplicationsService(
      prisma as unknown as PrismaService,
      {} as AiQueueService,
      storage as unknown as CvStorageService,
      jobs as unknown as JobsService,
      email as unknown as EmailService,
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
    expect(email.sendApplicationConfirmation).not.toHaveBeenCalled();
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
    const email = { sendApplicationConfirmation: jest.fn() };
    const service = new ApplicationsService(
      prisma as unknown as PrismaService,
      {} as AiQueueService,
      storage as unknown as CvStorageService,
      jobs as unknown as JobsService,
      email as unknown as EmailService,
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
    ).rejects.toThrow("Khu vực ứng tuyển phải nằm trong danh sách địa điểm của vị trí tuyển dụng.");

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(storage.storeCandidateCv).not.toHaveBeenCalled();
    expect(email.sendApplicationConfirmation).not.toHaveBeenCalled();
  });

  it("sends a confirmation email after creating an application", async () => {
    const transactionClient = {
      $executeRaw: jest.fn(),
      candidate: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: "candidate-1" }),
      },
      application: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: "application-1",
          status: "NEW",
        }),
      },
      candidateFile: {
        create: jest.fn(),
      },
      activityLog: {
        create: jest.fn().mockResolvedValue({ id: "activity-1" }),
      },
      cvParseResult: {
        create: jest.fn().mockResolvedValue({ id: "parse-1" }),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (tx: typeof transactionClient) => unknown) =>
          callback(transactionClient),
      ),
    };
    const storage = {
      storeCandidateCv: jest.fn(),
      deleteCandidateCv: jest.fn(),
    };
    const jobs = {
      getAdminJob: jest.fn().mockResolvedValue({
        id: "job-1",
        slug: "frontend-engineer",
        title: "Frontend Engineer",
        company: "Acme Vietnam",
        status: "PUBLISHED",
        locations: ["Hà Nội"],
        questions: [],
      }),
    };
    const email = { sendApplicationConfirmation: jest.fn().mockResolvedValue(undefined) };
    const service = new ApplicationsService(
      prisma as unknown as PrismaService,
      {} as AiQueueService,
      storage as unknown as CvStorageService,
      jobs as unknown as JobsService,
      email as unknown as EmailService,
    );

    await expect(
      service.createApplication({
        jobId: "job-1",
        fullName: "Candidate",
        email: "candidate@example.com",
        phone: "0901234567",
        applicationArea: "Hà Nội",
        portfolioUrl: "https://candidate.dev/cv",
        consentAccepted: true,
      }),
    ).resolves.toEqual({
      applicationId: "application-1",
      candidateId: "candidate-1",
      status: "NEW",
    });

    expect(email.sendApplicationConfirmation).toHaveBeenCalledWith({
      applicationId: "application-1",
      candidateEmail: "candidate@example.com",
      candidateName: "Candidate",
      jobTitle: "Frontend Engineer",
      companyName: "Acme Vietnam",
      jobSlug: "frontend-engineer",
      applicationArea: "Hà Nội",
    });
  });

  it("rejects duplicate applications before creating a new application", async () => {
    const transactionClient = {
      $executeRaw: jest.fn(),
      candidate: {
        findMany: jest.fn().mockResolvedValue([{
          id: "candidate-1",
        }]),
        create: jest.fn(),
      },
      application: {
        findFirst: jest.fn().mockResolvedValue({ id: "existing-application-1" }),
        create: jest.fn(),
      },
      candidateFile: {
        create: jest.fn(),
      },
      activityLog: {
        create: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (tx: typeof transactionClient) => unknown) =>
          callback(transactionClient),
      ),
    };
    const storage = {
      storeCandidateCv: jest.fn(),
      deleteCandidateCv: jest.fn(),
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
    const email = { sendApplicationConfirmation: jest.fn() };
    const service = new ApplicationsService(
      prisma as unknown as PrismaService,
      {} as AiQueueService,
      storage as unknown as CvStorageService,
      jobs as unknown as JobsService,
      email as unknown as EmailService,
    );

    await expect(
      service.createApplication({
        jobId: "job-1",
        fullName: "Candidate",
        email: "candidate@example.com",
        phone: "0901234567",
        applicationArea: "Hà Nội",
        portfolioUrl: "https://candidate.dev/cv",
        consentAccepted: true,
      }),
    ).rejects.toThrow("Bạn đã ứng tuyển vị trí này bằng email hoặc số điện thoại này.");

    expect(transactionClient.application.create).not.toHaveBeenCalled();
    expect(storage.storeCandidateCv).not.toHaveBeenCalled();
    expect(email.sendApplicationConfirmation).not.toHaveBeenCalled();
  });

  it("maps Prisma adapter duplicate application errors to conflict responses", async () => {
    const duplicateApplicationError = {
      meta: {
        modelName: "Application",
        driverAdapterError: {
          cause: {
            originalCode: "23505",
            originalMessage: 'duplicate key value violates unique constraint "Application_candidateId_jobId_key"',
            kind: "UniqueConstraintViolation",
            constraint: {
              fields: ['"candidateId"', '"jobId"'],
            },
          },
        },
      },
    };
    const transactionClient = {
      $executeRaw: jest.fn(),
      candidate: {
        findMany: jest.fn().mockResolvedValue([{
          id: "candidate-1",
        }]),
        create: jest.fn(),
      },
      application: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockRejectedValue(duplicateApplicationError),
      },
      candidateFile: {
        create: jest.fn(),
      },
      activityLog: {
        create: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (tx: typeof transactionClient) => unknown) =>
          callback(transactionClient),
      ),
    };
    const storage = {
      storeCandidateCv: jest.fn(),
      deleteCandidateCv: jest.fn(),
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
    const email = { sendApplicationConfirmation: jest.fn() };
    const service = new ApplicationsService(
      prisma as unknown as PrismaService,
      {} as AiQueueService,
      storage as unknown as CvStorageService,
      jobs as unknown as JobsService,
      email as unknown as EmailService,
    );

    await expect(
      service.createApplication({
        jobId: "job-1",
        fullName: "Candidate",
        email: "candidate@example.com",
        phone: "0901234567",
        applicationArea: "Hà Nội",
        portfolioUrl: "https://candidate.dev/cv",
        consentAccepted: true,
      }),
    ).rejects.toThrow("Bạn đã ứng tuyển vị trí này bằng email hoặc số điện thoại này.");

    expect(email.sendApplicationConfirmation).not.toHaveBeenCalled();
  });
});
