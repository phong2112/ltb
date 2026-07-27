jest.mock("sanitize-html", () => ({
  __esModule: true,
  default: (value: string) => value.replace(/<[^>]+>/g, ""),
}));

import type { AiQueueService } from "../ai/ai-queue.service";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("includes AI queue counters without querying external services", () => {
    const metrics = {
      enabled: true,
      queues: {
        "cv-extraction": { completed: 3, failed: 1 },
        "ai-cv-match": { completed: 2, failed: 1 },
      },
    } as const;
    const aiQueueService = {
      getMetrics: jest.fn().mockReturnValue(metrics),
    } as unknown as AiQueueService;

    expect(new HealthController(aiQueueService).check()).toMatchObject({
      status: "ok",
      service: "hr-copilot-api",
      aiQueues: metrics,
    });
  });
});
