jest.mock("../ai/queue/index.service", () => ({ AiQueueService: class {} }));
jest.mock("../ai/talent-pool-job-bus.service", () => ({
  TalentPoolJobBus: class {
    on = jest.fn();
    removeAllListeners = jest.fn();
    static EXTRACTED = "talent-pool.extracted";
  },
}));

import { BadRequestException } from "@nestjs/common";
import { TalentPoolService } from "./talent-pool.service";

function createService(overrides: {
  prisma?: Record<string, unknown>;
  storage?: Record<string, unknown>;
  config?: Record<string, unknown>;
  queue?: Record<string, unknown>;
  processing?: Record<string, unknown>;
  jobs?: Record<string, unknown>;
} = {}) {
  const prisma = {
    user: { upsert: jest.fn() },
    talentPoolEntry: { findUnique: jest.fn() },
    candidateFile: { findFirst: jest.fn(), count: jest.fn() },
    $transaction: jest.fn(),
    ...overrides.prisma,
  } as Record<string, unknown>;
  const storage = {
    storePoolCv: jest.fn(),
    deleteCandidateCv: jest.fn().mockResolvedValue(undefined),
    ...overrides.storage,
  } as Record<string, unknown>;
  const config = {
    get: jest.fn((key: string) => key === "MAX_CV_FILE_SIZE_MB" ? 10 : undefined),
    ...overrides.config,
  } as Record<string, unknown>;
  const queue = {
    enqueuePoolEntry: jest.fn().mockResolvedValue(true),
    enqueue: jest.fn().mockResolvedValue(true),
    ...overrides.queue,
  } as Record<string, unknown>;
  const processing = {
    processPoolEntry: jest.fn().mockResolvedValue(undefined),
    ...overrides.processing,
  } as Record<string, unknown>;
  const jobs = {
    getAdminJob: jest.fn(),
    ...overrides.jobs,
  } as Record<string, unknown>;
  const bus = { on: jest.fn(), removeAllListeners: jest.fn() } as Record<string, unknown>;

  const service = new TalentPoolService(
    prisma as never,
    storage as never,
    config as never,
    queue as never,
    processing as never,
    jobs as never,
    bus as never,
  );
  return { service, prisma, storage, config, queue, processing, jobs };
}

describe("TalentPoolService", () => {
  afterEach(() => jest.clearAllMocks());

  it("rejects an empty upload", async () => {
    const { service } = createService();
    await expect(service.uploadMany([], {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns a signature error for one file without aborting the valid file", async () => {
    const $transaction = jest.fn().mockResolvedValue("entry-1");
    const { service, queue } = createService({ prisma: { $transaction } });
    const files = [
      createFile("invalid.pdf", Buffer.from("not-a-pdf")),
      createFile("valid.pdf", Buffer.from("%PDF-1.7\n%%EOF")),
    ];

    await expect(service.uploadMany(files, {})).resolves.toEqual([
      expect.objectContaining({ fileName: "invalid.pdf", status: "error" }),
      { fileName: "valid.pdf", status: "created", entryId: "entry-1" },
    ]);
    expect(queue.enqueuePoolEntry).toHaveBeenCalledWith("entry-1", undefined);
  });

  it("stores the real database user id for the authenticated uploader", async () => {
    const userUpsert = jest.fn().mockResolvedValue({ id: "user-1" });
    const tx = {
      candidate: { create: jest.fn().mockResolvedValue({ id: "candidate-1" }) },
      talentPoolEntry: { create: jest.fn().mockResolvedValue({ id: "entry-1" }) },
      candidateFile: { create: jest.fn() },
      activityLog: { create: jest.fn() },
    };
    const $transaction = jest.fn(async (callback: (client: typeof tx) => Promise<string>) => callback(tx));
    const storePoolCv = jest.fn().mockResolvedValue({
      originalName: "valid.pdf",
      storedName: "cv/candidate-1/pool/entry-1/valid.pdf",
      mimeType: "application/pdf",
      sizeBytes: 14,
      path: "cv/candidate-1/pool/entry-1/valid.pdf",
    });
    const { service } = createService({
      prisma: { user: { upsert: userUpsert }, $transaction },
      storage: { storePoolCv },
    });

    await service.uploadMany([createFile("valid.pdf", Buffer.from("%PDF-1.7\n%%EOF"))], {
      uploadedBy: { sub: "legacy-session", email: "TA@Example.com", name: "TA" },
    });

    expect(userUpsert).toHaveBeenCalledWith(expect.objectContaining({ where: { email: "ta@example.com" } }));
    expect(tx.talentPoolEntry.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ uploadedByUserId: "user-1" }),
    }));
  });

  it("does not use the uploaded CV filename as the candidate name", async () => {
    const tx = {
      candidate: { create: jest.fn().mockResolvedValue({ id: "candidate-1" }) },
      talentPoolEntry: { create: jest.fn().mockResolvedValue({ id: "entry-1" }) },
      candidateFile: { create: jest.fn() },
      activityLog: { create: jest.fn() },
    };
    const $transaction = jest.fn(async (callback: (client: typeof tx) => Promise<string>) => callback(tx));
    const storePoolCv = jest.fn().mockResolvedValue({
      originalName: "IT Helpdesk_Dinh Xuan Phuong.pdf",
      storedName: "cv/candidate-1/pool/entry-1/file.pdf",
      mimeType: "application/pdf",
      sizeBytes: 14,
      path: "cv/candidate-1/pool/entry-1/file.pdf",
    });
    const { service } = createService({
      prisma: { $transaction },
      storage: { storePoolCv },
    });

    await service.uploadMany([createFile("IT Helpdesk_Dinh Xuan Phuong.pdf", Buffer.from("%PDF-1.7\n%%EOF"))], {});

    expect(tx.candidate.create).toHaveBeenCalledWith({
      data: { fullName: "Ứng viên đang xử lý", source: "talent_pool" },
    });
  });

  it("processes inline when the pool queue is disabled", async () => {
    const { service, processing } = createService({
      prisma: { $transaction: jest.fn().mockResolvedValue("entry-1") },
      queue: { enqueuePoolEntry: jest.fn().mockResolvedValue(false) },
    });

    await service.uploadMany([createFile("valid.pdf", Buffer.from("%PDF-1.7\n%%EOF"))], {});

    expect(processing.processPoolEntry).toHaveBeenCalledWith("entry-1");
  });

  it("marks a promoted application unavailable when AI is disabled", async () => {
    const cvParseResultUpdate = jest.fn().mockResolvedValue(undefined);
    const entry = {
      id: "entry-1",
      candidateId: "candidate-1",
      promotedApplicationId: null,
      promotedApplication: null,
      file: { id: "file-1" },
      candidate: { fullName: "Test", email: "test@example.com", phone: null, linkedinUrl: null, portfolioUrl: null },
      structuredData: null,
      extractedText: null,
    };
    const { service } = createService({
      prisma: {
        talentPoolEntry: { findUnique: jest.fn().mockResolvedValue(entry) },
        candidateFile: { findUniqueOrThrow: jest.fn().mockResolvedValue({ storageTier: "local", originalName: "cv.pdf", storedName: "stored.pdf", mimeType: "application/pdf", sizeBytes: 0, path: "/cv.pdf" }) },
        $transaction: jest.fn().mockResolvedValue({ applicationId: "app-1", jobId: "job-1" }),
        cvParseResult: { update: cvParseResultUpdate },
      },
      queue: { enqueue: jest.fn().mockResolvedValue(false) },
      jobs: { getAdminJob: jest.fn().mockResolvedValue({ id: "job-1", title: "Engineer" }) },
    });

    await expect(service.promote("entry-1", "job-1")).resolves.toEqual({ applicationId: "app-1", jobId: "job-1" });
    expect(cvParseResultUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { applicationId: "app-1" },
      data: expect.objectContaining({ errorMessage: "AI matching is disabled in this environment" }),
    }));
  });

  it("searches both canonical Candidate contacts and extracted contact snapshots", async () => {
    const count = jest.fn().mockReturnValue(Promise.resolve(0));
    const findMany = jest.fn().mockReturnValue(Promise.resolve([]));
    const { service } = createService({
      prisma: {
        talentPoolEntry: { count, findMany },
        $transaction: jest.fn().mockResolvedValue([0, []]),
      },
    });

    await service.list({ search: "snapshot@example.com" });

    expect(count).toHaveBeenCalledWith({
      where: {
        OR: expect.arrayContaining([
          { candidate: { email: { contains: "snapshot@example.com", mode: "insensitive" } } },
          { structuredData: { path: ["email"], string_contains: "snapshot@example.com" } },
        ]),
      },
    });
  });

  it("returns the extracted CV name when the stored candidate name is still a filename", async () => {
    const { service } = createService({
      prisma: {
        talentPoolEntry: {
          findUnique: jest.fn().mockResolvedValue({
            id: "entry-1",
            candidateId: "candidate-1",
            candidate: {
              id: "candidate-1",
              fullName: "1784628428323-inbound4290200574812242911",
              email: null,
              phone: null,
            },
            file: {
              id: "file-1",
              originalName: "1784628428323-inbound4290200574812242911.pdf",
              mimeType: "application/pdf",
              sizeBytes: 260_000,
            },
            extractedText: [
              "SENIOR QA / QA LEAD PROFILE",
              "HUE DO THI (SANDY)",
              "SENIOR QA ENGINEER | QA LEAD",
              "Certified Tester AI Testing | ISTQB Advanced Level - Test Manager | ISTQB Agile Tester",
              "Functional, regression, performance, security, and automation testing with LLM-based workflows.",
            ].join("\n"),
            structuredData: { email: "dothihue9x@gmail.com" },
          }),
        },
      },
    });

    await expect(service.getEntry("entry-1")).resolves.toEqual(expect.objectContaining({
      candidate: expect.objectContaining({ fullName: "Hue Do Thi" }),
      structuredData: expect.objectContaining({
        title: "SENIOR QA ENGINEER | QA LEAD",
        skills: expect.arrayContaining(["QA", "Automation Testing", "AI Testing", "ISTQB"]),
      }),
    }));
  });

  it("does not delete a shared physical CV after deleting a promoted pool entry", async () => {
    const tx = {
      candidateFile: { deleteMany: jest.fn() },
      talentPoolEntry: { delete: jest.fn() },
    };
    const { service, storage } = createService({
      prisma: {
        talentPoolEntry: { findUnique: jest.fn().mockResolvedValue({ id: "entry-1", file: { id: "file-1" } }) },
        candidateFile: {
          findFirst: jest.fn().mockResolvedValue({ path: "cv/shared.pdf" }),
          count: jest.fn().mockResolvedValue(1),
        },
        $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<void>) => callback(tx)),
      },
    });

    await service.deleteEntry("entry-1");

    expect(storage.deleteCandidateCv).not.toHaveBeenCalled();
  });
});

function createFile(originalname: string, buffer: Buffer) {
  return {
    originalname,
    mimetype: "application/pdf",
    size: buffer.length,
    buffer,
  } as Express.Multer.File;
}
