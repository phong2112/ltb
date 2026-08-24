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
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
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
        normalizedProfileUrl: "internal://candidate/candidate-1",
        displayName: "Nguyen Van A",
        notes: expect.stringContaining("internal_candidate_suggestion"),
      })],
    }));
    const createdNotes = prisma.sourcedProfile.createMany.mock.calls[0][0].data[0].notes;
    expect(JSON.parse(createdNotes)).not.toHaveProperty("evidence");
    expect(prisma.talentPoolEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { id: "asc" },
      take: 200,
    }));
  });

  it("continues scanning after the first internal retrieval page", async () => {
    const service = new InternalCandidateSuggestionService();
    const firstPage = Array.from({ length: 200 }, (_, index) => ({
      id: `pool-${String(index).padStart(3, "0")}`,
      candidateId: `candidate-${index}`,
      candidate: { fullName: `Candidate ${index}` },
      structuredData: { title: "Accountant", skills: ["Finance"] },
      summary: "Accounting",
      extractedText: "Accounting and bookkeeping",
      tags: ["Finance"],
      notes: null,
    }));
    const prisma = {
      talentPoolEntry: {
        findMany: jest.fn()
          .mockResolvedValueOnce(firstPage)
          .mockResolvedValueOnce([{
            id: "pool-match",
            candidateId: "candidate-match",
            candidate: { fullName: "Matching Candidate" },
            structuredData: { title: "QA Engineer", skills: ["Playwright"] },
            summary: "QA automation",
            extractedText: "QA Engineer Playwright Vietnam",
            tags: ["QA"],
            notes: null,
          }]),
      },
      candidate: { findMany: jest.fn().mockResolvedValue([]) },
      sourcedProfile: {
        findMany: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        updateMany: jest.fn(),
      },
    };

    await expect(service.suggestAndStore(prisma as never, "campaign-1", {
      id: "job-1",
      title: "QA Engineer",
      locations: ["Vietnam"],
      tags: ["Playwright"],
      description: "Automation",
      requirements: "Playwright",
    })).resolves.toMatchObject({ resultCount: 1 });
    expect(prisma.talentPoolEntry.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      cursor: { id: "pool-199" },
      skip: 1,
    }));
  });

  it("does not reuse a match score produced for a previous job", async () => {
    const service = new InternalCandidateSuggestionService();
    const prisma = {
      talentPoolEntry: { findMany: jest.fn().mockResolvedValue([]) },
      candidate: {
        findMany: jest.fn().mockResolvedValue([{
          id: "candidate-1",
          fullName: "Nguyen Van B",
          linkedinUrl: null,
          applications: [{
            id: "application-old",
            submittedPortfolioUrl: null,
            job: { title: "Accountant", tags: ["Finance"], locations: ["Vietnam"] },
            cvParseResult: { summary: "Accounting and finance", structuredData: null, extractedText: "Accounting" },
            matchResult: { score: 100 },
          }],
        }]),
      },
      sourcedProfile: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        updateMany: jest.fn(),
      },
    };

    await expect(service.suggestAndStore(prisma as never, "campaign-1", {
      id: "job-1",
      title: "Senior QA Engineer",
      locations: ["Vietnam"],
      tags: ["Playwright"],
      description: "Build automation tests",
      requirements: "Playwright",
    })).resolves.toMatchObject({ resultCount: 0, createdCount: 0 });
    expect(prisma.sourcedProfile.createMany).not.toHaveBeenCalled();
  });

  it("deduplicates talent pool and previous applications by candidate identity", async () => {
    const service = new InternalCandidateSuggestionService();
    const prisma = {
      talentPoolEntry: {
        findMany: jest.fn().mockResolvedValue([{
          id: "pool-1",
          candidateId: "candidate-1",
          candidate: { fullName: "Nguyen Van A" },
          structuredData: { title: "QA Engineer", skills: ["Playwright"] },
          summary: "QA Engineer",
          extractedText: "QA Engineer Playwright Vietnam",
          tags: ["QA"],
          notes: null,
        }]),
      },
      candidate: {
        findMany: jest.fn().mockResolvedValue([{
          id: "candidate-1",
          fullName: "Nguyen Van A",
          linkedinUrl: null,
          applications: [{
            id: "application-1",
            submittedPortfolioUrl: null,
            job: { title: "QA Engineer", tags: ["Playwright"], locations: ["Vietnam"] },
            cvParseResult: { summary: "QA Engineer", structuredData: null, extractedText: "QA Engineer Playwright Vietnam" },
          }],
        }]),
      },
      sourcedProfile: {
        findMany: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "profile-1" }]),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        updateMany: jest.fn(),
      },
    };

    await expect(service.suggestAndStore(prisma as never, "campaign-1", {
      id: "job-1",
      title: "QA Engineer",
      locations: ["Vietnam"],
      tags: ["Playwright"],
      description: "Build automation tests",
      requirements: "Playwright",
    })).resolves.toMatchObject({ resultCount: 1, createdCount: 1 });
    expect(prisma.sourcedProfile.createMany.mock.calls[0][0].data).toHaveLength(1);
    expect(prisma.sourcedProfile.createMany.mock.calls[0][0].data[0]).toMatchObject({
      normalizedProfileUrl: "internal://candidate/candidate-1",
    });
  });
});
