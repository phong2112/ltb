jest.mock("sanitize-html", () => ({
  __esModule: true,
  default: (value: string) => value.replace(/<[^>]+>/g, ""),
}));

import type { ConfigService } from "@nestjs/config";
import type { Job } from "bullmq";
import { AiQueueService } from "./ai-queue.service";
import type { AiService } from "./ai.service";
import type { TalentPoolProcessingService } from "./talent-pool-processing.service";

type ProcessingJob = Job<{ applicationId: string; runId?: string }>;
type PoolJob = Job<{ talentPoolEntryId: string; targetJobId?: string }>;

type QueueServiceInternals = {
  matchQueue: { add: jest.Mock };
  processExtractionJob: (job: ProcessingJob) => Promise<void>;
  processMatchJob: (job: ProcessingJob) => Promise<void>;
  processPoolExtractionJob: (job: PoolJob) => Promise<void>;
  recordCompleted: (queue: "cv-extraction" | "ai-cv-match" | "talent-pool-extraction") => void;
  recordFailed: (
    queue: "cv-extraction" | "ai-cv-match" | "talent-pool-extraction",
    stage: "extraction" | "analysis" | "queue",
    job: ProcessingJob,
    error: Error,
  ) => void;
};

describe("AiQueueService", () => {
  it("extracts a CV before placing the application on the Groq match queue", async () => {
    const aiService = createAiService();
    const service = new AiQueueService(
      createConfig({ AI_PROVIDER: "groq", AI_JOB_ATTEMPTS: 2 }),
      aiService as unknown as AiService,
      createPoolProcessingService() as unknown as TalentPoolProcessingService,
    );
    const matchQueue = { add: jest.fn().mockResolvedValue(undefined) };
    const internals = service as unknown as QueueServiceInternals;
    internals.matchQueue = matchQueue;

    await internals.processExtractionJob(createJob("application-1"));

    expect(aiService.extractApplicationCv).toHaveBeenCalledWith("application-1");
    expect(matchQueue.add).toHaveBeenCalledWith(
      "analyze-application",
      { applicationId: "application-1" },
      {
        attempts: 2,
        backoff: { type: "exponential", delay: 5_000 },
        jobId: "match-application-1",
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
    expect(aiService.extractApplicationCv.mock.invocationCallOrder[0]).toBeLessThan(
      matchQueue.add.mock.invocationCallOrder[0],
    );
  });

  it("keeps forced retry run ids across extraction and match jobs", async () => {
    const aiService = createAiService();
    const service = new AiQueueService(
      createConfig({ AI_PROVIDER: "groq", AI_JOB_ATTEMPTS: 2 }),
      aiService as unknown as AiService,
      createPoolProcessingService() as unknown as TalentPoolProcessingService,
    );
    const matchQueue = { add: jest.fn().mockResolvedValue(undefined) };
    const internals = service as unknown as QueueServiceInternals;
    internals.matchQueue = matchQueue;

    await internals.processExtractionJob({
      ...createJob("application-1"),
      data: { applicationId: "application-1", runId: "retry-1" },
    });

    expect(matchQueue.add).toHaveBeenCalledWith(
      "analyze-application",
      { applicationId: "application-1", runId: "retry-1" },
      expect.objectContaining({ jobId: "match-application-1-retry-1" }),
    );
  });

  it("exposes in-process completion and final-failure counters", () => {
    const service = new AiQueueService(
      createConfig({ AI_PROVIDER: "groq" }),
      createAiService() as unknown as AiService,
      createPoolProcessingService() as unknown as TalentPoolProcessingService,
    );
    const internals = service as unknown as QueueServiceInternals;

    internals.recordCompleted("cv-extraction");
    internals.recordFailed(
      "ai-cv-match",
      "analysis",
      createJob("application-4", 2, 2),
      new Error("invalid model response"),
    );

    expect(service.getMetrics()).toEqual({
      enabled: true,
      queues: {
        "cv-extraction": { completed: 1, failed: 0 },
        "ai-cv-match": { completed: 0, failed: 1 },
        "talent-pool-extraction": { completed: 0, failed: 0 },
      },
    });
  });

  it("logs exhausted jobs with the stable AI_JOB_FAILED prefix", () => {
    const service = new AiQueueService(
      createConfig({ AI_PROVIDER: "groq" }),
      createAiService() as unknown as AiService,
      createPoolProcessingService() as unknown as TalentPoolProcessingService,
    );
    const loggerError = jest.spyOn(
      (service as unknown as { logger: { error: (message: string) => void } }).logger,
      "error",
    ).mockImplementation(() => undefined);

    (service as unknown as QueueServiceInternals).recordFailed(
      "cv-extraction",
      "extraction",
      { ...createJob("application-5", 2, 2), id: "job-5" } as ProcessingJob,
      new Error("OCR failed"),
    );

    expect(loggerError).toHaveBeenCalledWith(expect.stringMatching(
      /^AI_JOB_FAILED .*"applicationId":"application-5".*"stage":"extraction"/,
    ));
  });

  it("runs the Groq match stage from the second queue", async () => {
    const aiService = createAiService();
    const service = new AiQueueService(
      createConfig({ AI_PROVIDER: "groq" }),
      aiService as unknown as AiService,
      createPoolProcessingService() as unknown as TalentPoolProcessingService,
    );

    await (service as unknown as QueueServiceInternals).processMatchJob(
      createJob("application-2"),
    );

    expect(aiService.analyzeApplication).toHaveBeenCalledWith("application-2");
  });

  it("persists a failed status only after the final extraction attempt", async () => {
    const failure = new Error("OCR failed");
    const aiService = createAiService();
    aiService.extractApplicationCv.mockRejectedValue(failure);
    const service = new AiQueueService(
      createConfig({ AI_PROVIDER: "groq" }),
      aiService as unknown as AiService,
      createPoolProcessingService() as unknown as TalentPoolProcessingService,
    );
    const internals = service as unknown as QueueServiceInternals;

    await expect(
      internals.processExtractionJob(createJob("application-3", 0, 2)),
    ).rejects.toThrow("OCR failed");
    expect(aiService.markFailed).not.toHaveBeenCalled();

    await expect(
      internals.processExtractionJob(createJob("application-3", 1, 2)),
    ).rejects.toThrow("OCR failed");
    expect(aiService.markFailed).toHaveBeenCalledWith(
      "application-3",
      failure,
      "extraction",
    );
  });

  it("returns false when pool extraction is disabled", async () => {
    const service = new AiQueueService(
      createConfig({ AI_PROVIDER: "disabled" }),
      createAiService() as unknown as AiService,
      createPoolProcessingService() as unknown as TalentPoolProcessingService,
    );

    await expect(service.enqueuePoolEntry("entry-1")).resolves.toBe(false);
  });

  it("processes a pool entry and promotes it before enqueueing application matching", async () => {
    const poolProcessing = createPoolProcessingService();
    const service = new AiQueueService(
      createConfig({ AI_PROVIDER: "groq" }),
      createAiService() as unknown as AiService,
      poolProcessing as unknown as TalentPoolProcessingService,
    );
    const enqueue = jest.spyOn(service, "enqueue").mockResolvedValue(true);

    await (service as unknown as QueueServiceInternals).processPoolExtractionJob({
      data: { talentPoolEntryId: "entry-1", targetJobId: "job-1" },
      attemptsMade: 0,
      opts: { attempts: 2 },
    } as PoolJob);

    expect(poolProcessing.processPoolEntry).toHaveBeenCalledWith("entry-1");
    expect(poolProcessing.promotePoolEntry).toHaveBeenCalledWith("entry-1", "job-1", true);
    expect(enqueue).toHaveBeenCalledWith("application-1");
  });
});

function createAiService() {
  return {
    extractApplicationCv: jest.fn().mockResolvedValue(undefined),
    analyzeApplication: jest.fn().mockResolvedValue(undefined),
    markFailed: jest.fn().mockResolvedValue(undefined),
  };
}

function createPoolProcessingService() {
  return {
    processPoolEntry: jest.fn().mockResolvedValue(undefined),
    promotePoolEntry: jest.fn().mockResolvedValue({ applicationId: "application-1", jobId: "job-1" }),
    markPoolFailed: jest.fn().mockResolvedValue(undefined),
  };
}

function createConfig(values: Record<string, unknown>) {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

function createJob(applicationId: string, attemptsMade = 0, attempts = 2) {
  return {
    data: { applicationId },
    attemptsMade,
    opts: { attempts },
  } as ProcessingJob;
}
