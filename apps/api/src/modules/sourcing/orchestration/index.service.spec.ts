import { SourcingDiscoveryLocationScope } from "@prisma/client";
import type { AiModelPortalService } from "@/modules/ai/portal/index.service";
import type { LinkedinDiscoveryService } from "@/modules/sourcing/discovery/index.service";
import type { InternalCandidateSuggestionService } from "@/modules/sourcing/internal-suggestions/index.service";
import { SourcingOrchestrationService } from "./index.service";

describe("SourcingOrchestrationService", () => {
  it("uses an optional AI plan and combines internal plus public discovery", async () => {
    const aiPortal = createAiPortal(true);
    aiPortal.planSourcing.mockResolvedValue({
      titleVariants: ["SDET"],
      skillSignals: ["API Testing"],
    });
    const internal = createInternalSuggestions({ createdCount: 2, resultCount: 3 });
    const discovery = createDiscovery({
      provider: "brave",
      providerStatus: "COMPLETED",
      createdCount: 4,
      duplicateCount: 1,
      queryCount: 5,
      successfulQueryCount: 5,
      resultCount: 5,
      skippedQueries: [],
      failures: [],
      profiles: [],
    });
    const prisma = createPrisma();
    const service = new SourcingOrchestrationService(
      aiPortal as unknown as AiModelPortalService,
      discovery as unknown as LinkedinDiscoveryService,
      internal as unknown as InternalCandidateSuggestionService,
    );

    await expect(service.run(
      prisma as never,
      "campaign-1",
      job(),
      SourcingDiscoveryLocationScope.VIETNAM,
    )).resolves.toMatchObject({
      status: "COMPLETED",
      aiAssisted: true,
      createdCount: 6,
      resultCount: 8,
      stages: [
        { stage: "AI_QUERY_PLANNING", status: "COMPLETED" },
        { stage: "INTERNAL_DISCOVERY", status: "COMPLETED" },
        { stage: "PUBLIC_WEB_DISCOVERY", status: "COMPLETED" },
      ],
      profiles: [{ id: "profile-1" }],
    });
    expect(discovery.discoverAndStore).toHaveBeenCalledWith(
      prisma,
      "campaign-1",
      expect.any(Object),
      expect.objectContaining({
        enhancements: {
          titleVariants: ["SDET"],
          skillSignals: ["API Testing"],
        },
      }),
    );
    expect(prisma.sourcingCampaign.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "campaign-1" },
      data: expect.objectContaining({ brief: expect.any(Object), searchQueries: expect.any(Array) }),
    }));
  });

  it("falls back to deterministic queries when the AI planner fails", async () => {
    const aiPortal = createAiPortal(true);
    aiPortal.planSourcing.mockRejectedValue(new Error("quota exceeded"));
    const discovery = createDiscovery(completedDiscovery());
    const service = new SourcingOrchestrationService(
      aiPortal as unknown as AiModelPortalService,
      discovery as unknown as LinkedinDiscoveryService,
      createInternalSuggestions({ createdCount: 0, resultCount: 0 }) as unknown as InternalCandidateSuggestionService,
    );

    const result = await service.run(
      createPrisma() as never,
      "campaign-1",
      job(),
      SourcingDiscoveryLocationScope.GLOBAL,
    );

    expect(result.status).toBe("DEGRADED");
    expect(result.aiAssisted).toBe(false);
    expect(result.stages[0]).toMatchObject({ stage: "AI_QUERY_PLANNING", status: "DEGRADED" });
    expect(discovery.discoverAndStore).toHaveBeenCalledWith(
      expect.anything(),
      "campaign-1",
      expect.any(Object),
      { locationScope: "GLOBAL", enhancements: undefined },
    );
  });

  it("keeps internal results when Brave Search is unavailable", async () => {
    const unavailable = {
      ...completedDiscovery(),
      providerStatus: "UNAVAILABLE" as const,
      queryCount: 5,
      successfulQueryCount: 0,
      failures: [{
        queryId: "provider",
        code: "DISABLED" as const,
        message: "disabled",
        retryable: false,
        attempts: 0,
      }],
    };
    const service = new SourcingOrchestrationService(
      createAiPortal(false) as unknown as AiModelPortalService,
      createDiscovery(unavailable) as unknown as LinkedinDiscoveryService,
      createInternalSuggestions({ createdCount: 2, resultCount: 2 }) as unknown as InternalCandidateSuggestionService,
    );

    const result = await service.run(
      createPrisma() as never,
      "campaign-1",
      job(),
      SourcingDiscoveryLocationScope.VIETNAM,
    );

    expect(result).toMatchObject({
      status: "DEGRADED",
      createdCount: 2,
      resultCount: 2,
    });
    expect(result.stages).toContainEqual(expect.objectContaining({
      stage: "PUBLIC_WEB_DISCOVERY",
      status: "SKIPPED",
    }));
  });
});

function createAiPortal(enabled: boolean) {
  return {
    groqEnabled: enabled,
    planSourcing: jest.fn(),
  };
}

function createInternalSuggestions(result: { createdCount: number; resultCount: number }) {
  return {
    suggestAndStore: jest.fn().mockResolvedValue({ ...result, duplicateCount: 0, profiles: [] }),
  };
}

function createDiscovery(result: ReturnType<typeof completedDiscovery> | Record<string, unknown>) {
  return {
    discoverAndStore: jest.fn().mockResolvedValue(result),
  };
}

function completedDiscovery() {
  return {
    provider: "brave" as const,
    providerStatus: "COMPLETED" as const,
    createdCount: 0,
    duplicateCount: 0,
    queryCount: 5,
    successfulQueryCount: 5,
    resultCount: 0,
    skippedQueries: [],
    failures: [],
    profiles: [],
  };
}

function createPrisma() {
  return {
    sourcingCampaign: {
      update: jest.fn().mockResolvedValue({ id: "campaign-1" }),
    },
    sourcedProfile: {
      findMany: jest.fn().mockResolvedValue([{ id: "profile-1" }]),
    },
  };
}

function job() {
  return {
    id: "job-1",
    title: "QA Engineer",
    company: "LTB",
    department: "Engineering",
    locations: ["Vietnam"],
    level: "Senior",
    tags: ["Playwright"],
    description: "Build reliable products",
    requirements: "Automation testing and API testing",
  };
}
