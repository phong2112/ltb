import { BadRequestException } from "@nestjs/common";
import { SourcingOrchestrationStatus } from "@prisma/client";
import { SourcingService } from "./index.service";

function createService() {
  const prisma = {
    sourcingCampaign: {
      findUnique: jest.fn().mockResolvedValue({ id: "campaign-1" }),
    },
    sourcedProfile: {
      findMany: jest.fn()
        .mockResolvedValueOnce([{ normalizedProfileUrl: "https://www.linkedin.com/in/existing" }])
        .mockResolvedValueOnce([{ normalizedProfileUrl: "https://www.linkedin.com/in/from-another-campaign" }])
        .mockResolvedValueOnce([{ id: "profile-1" }, { id: "profile-2" }]),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  return {
    prisma,
    service: new SourcingService(prisma as never, {} as never, {} as never, {} as never),
  };
}

describe("SourcingService profile import", () => {
  it("normalizes URLs, skips campaign duplicates, and reports invalid inputs", async () => {
    const { prisma, service } = createService();

    await expect(service.importProfiles("campaign-1", {
      source: "LINKEDIN",
      urls: [
        "linkedin.com/in/existing?trk=search",
        "https://linkedin.com/in/new-profile/",
        "https://example.com/not-linkedin",
      ],
    })).resolves.toMatchObject({
      createdCount: 1,
      duplicateCount: 1,
      foundInOtherCampaignCount: 1,
      invalidUrls: ["https://example.com/not-linkedin"],
    });

    expect(prisma.sourcedProfile.createMany).toHaveBeenCalledWith({
      data: [{
        campaignId: "campaign-1",
        source: "LINKEDIN",
        profileUrl: "https://www.linkedin.com/in/new-profile",
        normalizedProfileUrl: "https://www.linkedin.com/in/new-profile",
        extractionMethod: "ta_provided_url",
      }],
      skipDuplicates: true,
    });
  });

  it("rejects a batch without any valid LinkedIn profile URL", async () => {
    const { service } = createService();

    await expect(service.importProfiles("campaign-1", {
      source: "LINKEDIN",
      urls: ["https://linkedin.com/company/ltb"],
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("SourcingService orchestration queue", () => {
  it("queues one run and returns its persistent campaign state", async () => {
    const queue = { enqueue: jest.fn().mockResolvedValue(undefined) };
    const campaign = campaignWithRunState(SourcingOrchestrationStatus.QUEUED);
    const prisma = {
      sourcingCampaign: {
        findUnique: jest.fn().mockResolvedValue(campaign),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const service = new SourcingService(prisma as never, {} as never, {} as never, queue as never);

    const result = await service.queueOrchestration("campaign-1");

    expect(result).toMatchObject({
      queued: true,
      campaign: { id: "campaign-1", orchestration: { status: "QUEUED" } },
    });
    expect(queue.enqueue).toHaveBeenCalledWith("campaign-1", expect.any(String));
    expect(prisma.sourcingCampaign.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        orchestrationStatus: { notIn: ["QUEUED", "RUNNING"] },
      }),
      data: expect.objectContaining({ orchestrationStatus: "QUEUED" }),
    }));
  });

  it("returns the active run instead of enqueuing a duplicate campaign run", async () => {
    const queue = { enqueue: jest.fn() };
    const prisma = {
      sourcingCampaign: {
        findUnique: jest.fn().mockResolvedValue(campaignWithRunState(SourcingOrchestrationStatus.RUNNING)),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const service = new SourcingService(prisma as never, {} as never, {} as never, queue as never);

    await expect(service.queueOrchestration("campaign-1")).resolves.toMatchObject({
      queued: false,
      campaign: { orchestration: { status: "RUNNING" } },
    });
    expect(queue.enqueue).not.toHaveBeenCalled();
  });
});

function campaignWithRunState(status: SourcingOrchestrationStatus) {
  return {
    id: "campaign-1",
    job: { id: "job-1" },
    profiles: [],
    _count: { profiles: 0 },
    orchestrationStatus: status,
    orchestrationRunId: "run-1",
    orchestrationResult: null,
    orchestrationError: null,
    orchestrationStartedAt: null,
    orchestrationFinishedAt: null,
  };
}
