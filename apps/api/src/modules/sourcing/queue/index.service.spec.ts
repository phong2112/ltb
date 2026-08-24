import type { ConfigService } from "@nestjs/config";
import { SourcingOrchestrationStatus } from "@prisma/client";
import type { PrismaService } from "@/modules/prisma";
import type { SourcingOrchestrationService } from "@/modules/sourcing/orchestration/index.service";
import { SourcingOrchestrationQueueService } from "./index.service";

type QueueInternals = {
  process: (job: { data: { campaignId: string; runId: string } }) => Promise<void>;
  recoverStaleRuns: () => Promise<void>;
};

describe("SourcingOrchestrationQueueService", () => {
  it("runs a queued campaign once and persists a completed summary", async () => {
    const prisma = createPrisma();
    const orchestration = {
      run: jest.fn().mockResolvedValue({
        status: "COMPLETED",
        strategy: "retrieval_first_human_in_loop",
        aiAssisted: true,
        createdCount: 2,
        resultCount: 3,
        stages: [],
        profiles: [{ id: "profile-1" }],
      }),
    };
    const service = new SourcingOrchestrationQueueService(
      createConfig(),
      prisma as unknown as PrismaService,
      orchestration as unknown as SourcingOrchestrationService,
    );

    await (service as unknown as QueueInternals).process({
      data: { campaignId: "campaign-1", runId: "run-1" },
    });

    expect(orchestration.run).toHaveBeenCalledWith(
      prisma,
      "campaign-1",
      expect.objectContaining({ id: "job-1" }),
      "VIETNAM",
    );
    expect(prisma.sourcingCampaign.updateMany.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      where: expect.objectContaining({
        orchestrationStatus: { in: ["QUEUED", "RUNNING"] },
      }),
    }));
    expect(prisma.sourcingCampaign.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { id: "campaign-1", orchestrationRunId: "run-1" },
      data: expect.objectContaining({
        orchestrationStatus: SourcingOrchestrationStatus.COMPLETED,
        orchestrationResult: expect.not.objectContaining({ profiles: expect.anything() }),
      }),
    }));
  });

  it("does not run stale jobs after a newer run replaces the queued state", async () => {
    const prisma = createPrisma({ startedCount: 0 });
    const orchestration = { run: jest.fn() };
    const service = new SourcingOrchestrationQueueService(
      createConfig(),
      prisma as unknown as PrismaService,
      orchestration as unknown as SourcingOrchestrationService,
    );

    await (service as unknown as QueueInternals).process({
      data: { campaignId: "campaign-1", runId: "stale-run" },
    });

    expect(orchestration.run).not.toHaveBeenCalled();
    expect(prisma.sourcingCampaign.findFirst).not.toHaveBeenCalled();
  });

  it("marks interrupted queued or running campaigns as failed", async () => {
    const prisma = {
      sourcingCampaign: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };
    const service = new SourcingOrchestrationQueueService(
      createConfig(),
      prisma as unknown as PrismaService,
      {} as SourcingOrchestrationService,
    );

    await (service as unknown as QueueInternals).recoverStaleRuns();

    expect(prisma.sourcingCampaign.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: expect.arrayContaining([
        expect.objectContaining({ orchestrationStatus: SourcingOrchestrationStatus.QUEUED }),
        expect.objectContaining({ orchestrationStatus: SourcingOrchestrationStatus.RUNNING }),
      ]) },
      data: expect.objectContaining({ orchestrationStatus: SourcingOrchestrationStatus.FAILED }),
    }));
  });
});

function createPrisma(options: { startedCount?: number } = {}) {
  return {
    sourcingCampaign: {
      updateMany: jest.fn()
        .mockResolvedValueOnce({ count: options.startedCount ?? 1 })
        .mockResolvedValue({ count: 1 }),
      findFirst: jest.fn().mockResolvedValue({
        id: "campaign-1",
        discoveryLocationScope: "VIETNAM",
        job: { id: "job-1", title: "QA Engineer" },
      }),
    },
  };
}

function createConfig() {
  return {
    getOrThrow: jest.fn().mockReturnValue("redis://localhost:6379"),
    get: jest.fn().mockReturnValue(30),
  } as unknown as ConfigService;
}
