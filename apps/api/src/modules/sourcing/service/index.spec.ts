import { BadRequestException } from "@nestjs/common";
import { SourcingCampaignStatus, SourcingOrchestrationStatus, SourcingProfileFeedback } from "@prisma/client";
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

  it("keeps the original case-sensitive public URL for navigation", async () => {
    const { prisma, service } = createService();

    await service.importProfiles("campaign-1", {
      source: "PUBLIC_WEB",
      urls: ["https://Portfolio.Example.com/NguyenA/CaseStudy?utm_source=linkedin"],
    });

    expect(prisma.sourcedProfile.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({
        profileUrl: "https://portfolio.example.com/NguyenA/CaseStudy",
        normalizedProfileUrl: "https://portfolio.example.com/nguyena/casestudy",
      })],
    }));
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

  it("does not queue automatic discovery for a paused campaign", async () => {
    const queue = { enqueue: jest.fn() };
    const prisma = {
      sourcingCampaign: {
        findUnique: jest.fn().mockResolvedValue({ id: "campaign-1", status: "PAUSED" }),
        updateMany: jest.fn(),
      },
    };
    const service = new SourcingService(prisma as never, {} as never, {} as never, queue as never);

    await expect(service.queueOrchestration("campaign-1")).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.sourcingCampaign.updateMany).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });
});

describe("SourcingService campaign lifecycle", () => {
  it("does not pause a campaign while orchestration is active", async () => {
    const prisma = {
      sourcingCampaign: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue({ id: "campaign-1" }),
      },
    };
    const service = new SourcingService(prisma as never, {} as never, {} as never, {} as never);

    await expect(service.updateCampaignStatus("campaign-1", SourcingCampaignStatus.PAUSED))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.sourcingCampaign.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        orchestrationStatus: { notIn: ["QUEUED", "RUNNING"] },
      }),
    }));
  });
});

describe("SourcingService ranking feedback", () => {
  it("records feedback only for a profile in the requested campaign", async () => {
    const prisma = {
      sourcedProfile: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "profile-1", feedback: "RELEVANT" }),
      },
    };
    const service = new SourcingService(prisma as never, {} as never, {} as never, {} as never);

    await expect(service.updateProfileFeedback(
      "campaign-1",
      "profile-1",
      SourcingProfileFeedback.RELEVANT,
    )).resolves.toMatchObject({ feedback: "RELEVANT" });
    expect(prisma.sourcedProfile.updateMany).toHaveBeenCalledWith({
      where: { id: "profile-1", campaignId: "campaign-1" },
      data: { feedback: "RELEVANT", feedbackAt: expect.any(Date) },
    });
  });

  it("reports feedback coverage and labeled precision at 10", async () => {
    const prisma = {
      sourcingCampaign: { findUnique: jest.fn().mockResolvedValue({ id: "campaign-1" }) },
      sourcedProfile: {
        findMany: jest.fn().mockResolvedValue([
          { id: "high", feedback: "RELEVANT", notes: JSON.stringify({ potentialScore: 90 }) },
          { id: "medium", feedback: "NOT_RELEVANT", notes: JSON.stringify({ potentialScore: 70 }) },
          { id: "unlabeled", feedback: null, notes: JSON.stringify({ potentialScore: 80 }) },
        ]),
      },
    };
    const service = new SourcingService(prisma as never, {} as never, {} as never, {} as never);

    await expect(service.getCampaignEvaluation("campaign-1")).resolves.toEqual({
      totalProfiles: 3,
      labeledCount: 2,
      coverage: 0.667,
      feedbackCounts: { relevant: 1, maybe: 0, notRelevant: 1 },
      ranking: {
        top10Count: 3,
        top10LabeledCount: 2,
        top10RelevantCount: 1,
        precisionAt10: 0.5,
      },
    });
  });
});

function campaignWithRunState(status: SourcingOrchestrationStatus) {
  return {
    id: "campaign-1",
    status: "ACTIVE",
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
