import type { ConfigService } from "@nestjs/config";
import { ServiceUnavailableException } from "@nestjs/common";
import { LinkedinDiscoveryService } from "./index.service";

describe("LinkedinDiscoveryService", () => {
  it("requires discovery to be explicitly enabled", () => {
    const service = new LinkedinDiscoveryService(createConfigService({
      SOURCING_DISCOVERY_ENABLED: "false",
      BRAVE_SEARCH_API_KEY: "token",
    }));

    expect(() => service.createAdapter()).toThrow(ServiceUnavailableException);
  });

  it("stores deduplicated LinkedIn discovery results", async () => {
    const service = new LinkedinDiscoveryService(createConfigService({
      SOURCING_DISCOVERY_ENABLED: "true",
      BRAVE_SEARCH_API_KEY: "token",
      SOURCING_DISCOVERY_MAX_QUERIES_PER_CAMPAIGN: 1,
      SOURCING_DISCOVERY_RESULTS_PER_QUERY: 10,
    }));
    jest.spyOn(service, "createAdapter").mockReturnValue({
      discover: jest.fn().mockResolvedValue([
        {
          source: "LINKEDIN",
          profileUrl: "https://www.linkedin.com/in/a",
          normalizedProfileUrl: "https://www.linkedin.com/in/a",
          displayName: "A",
          headline: "Senior QA Engineer",
          snippet: "Playwright API testing Vietnam",
          queryId: "q1",
          query: "site:linkedin.com/in Senior QA",
          searchRank: 1,
          fetchedAt: new Date("2026-08-07T00:00:00.000Z"),
        },
      ]),
    });
    const prisma = {
      sourcedProfile: {
        findMany: jest.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: "profile-1" }]),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    await expect(service.discoverAndStore(prisma as never, "campaign-1", {
      title: "Senior QA Engineer",
      locations: ["Vietnam"],
      tags: ["Playwright", "API testing"],
      requirements: "Automation testing",
      description: "Build tests",
    })).resolves.toMatchObject({
      createdCount: 1,
      duplicateCount: 0,
      queryCount: 1,
      resultCount: 1,
      profiles: [{ id: "profile-1" }],
    });

    expect(prisma.sourcedProfile.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({
        campaignId: "campaign-1",
        source: "LINKEDIN",
        normalizedProfileUrl: "https://www.linkedin.com/in/a",
        extractionMethod: "search_api_snippet",
        notes: expect.stringContaining("potentialScore"),
      })],
    }));
  });
});

function createConfigService(values: Record<string, unknown>) {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}
