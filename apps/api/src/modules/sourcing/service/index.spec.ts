import { BadRequestException } from "@nestjs/common";
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
