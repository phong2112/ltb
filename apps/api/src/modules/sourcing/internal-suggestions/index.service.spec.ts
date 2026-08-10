import { InternalCandidateSuggestionService } from "./index.service";

describe("InternalCandidateSuggestionService", () => {
  it("suggests matching talent pool entries and stores them as sourced profiles", async () => {
    const service = new InternalCandidateSuggestionService();
    const prisma = {
      talentPoolEntry: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "pool-1",
            candidateId: "candidate-1",
            candidate: { fullName: "Nguyen Van A" },
            file: { originalName: "a.pdf" },
            structuredData: {
              fullName: "Nguyen Van A",
              title: "Senior QA Engineer",
              skills: ["Playwright", "API testing", "Selenium"],
              cvSummary: {
                overview: "Senior QA automation tại Vietnam.",
                keySkills: ["Playwright", "API testing"],
              },
            },
            summary: "Đã trích xuất nội dung CV.",
            extractedText: "Senior QA Engineer with Playwright and API testing in Vietnam.",
            tags: ["QA"],
            notes: null,
          },
        ]),
      },
      candidate: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      sourcedProfile: {
        findMany: jest.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: "sourced-1" }]),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    await expect(service.suggestAndStore(prisma as never, "campaign-1", {
      id: "job-1",
      title: "Senior QA Engineer",
      locations: ["Vietnam"],
      tags: ["Playwright", "API testing"],
      description: "Build automation tests",
      requirements: "Playwright\nAPI testing",
    })).resolves.toMatchObject({
      createdCount: 1,
      duplicateCount: 0,
      resultCount: 1,
      profiles: [{ id: "sourced-1" }],
    });

    expect(prisma.sourcedProfile.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({
        source: "TALENT_POOL",
        profileUrl: "/admin/talent-pool/pool-1",
        normalizedProfileUrl: "internal://talent-pool/pool-1",
        displayName: "Nguyen Van A",
        notes: expect.stringContaining("internal_candidate_suggestion"),
      })],
    }));
  });
});
