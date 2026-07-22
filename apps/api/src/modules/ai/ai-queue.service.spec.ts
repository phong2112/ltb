jest.mock("sanitize-html", () => ({
  __esModule: true,
  default: (value: string) => value.replace(/<[^>]+>/g, ""),
}));

import type { ConfigService } from "@nestjs/config";
import type { Job } from "bullmq";
import { AiQueueService } from "./ai-queue.service";
import type { AiService } from "./ai.service";

type ProcessingJob = Job<{ applicationId: string }>;

type QueueServiceInternals = {
  matchQueue: { add: jest.Mock };
  processExtractionJob: (job: ProcessingJob) => Promise<void>;
  processMatchJob: (job: ProcessingJob) => Promise<void>;
};

describe("AiQueueService", () => {
  it("extracts a CV before placing the application on the Ollama match queue", async () => {
    const aiService = createAiService();
    const service = new AiQueueService(
      createConfig({ AI_PROVIDER: "ollama", AI_JOB_ATTEMPTS: 2 }),
      aiService as unknown as AiService,
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
        removeOnFail: 100,
      },
    );
    expect(aiService.extractApplicationCv.mock.invocationCallOrder[0]).toBeLessThan(
      matchQueue.add.mock.invocationCallOrder[0],
    );
  });

  it("runs the Ollama match stage from the second queue", async () => {
    const aiService = createAiService();
    const service = new AiQueueService(
      createConfig({ AI_PROVIDER: "ollama" }),
      aiService as unknown as AiService,
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
      createConfig({ AI_PROVIDER: "ollama" }),
      aiService as unknown as AiService,
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
});

function createAiService() {
  return {
    extractApplicationCv: jest.fn().mockResolvedValue(undefined),
    analyzeApplication: jest.fn().mockResolvedValue(undefined),
    markFailed: jest.fn().mockResolvedValue(undefined),
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
