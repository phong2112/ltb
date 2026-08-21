jest.mock("sanitize-html", () => ({
  __esModule: true,
  default: (value: string) => value.replace(/<[^>]+>/g, ""),
}));

import type { PrismaService } from "../../prisma";
import type { CvStorageService } from "../../files/storage/index.service";
import { CandidatesService } from "../service/index.service";

describe("CandidatesService", () => {
  it("returns a lightweight application analysis without extracted CV text", async () => {
    const prisma = {
      application: {
        findUnique: jest.fn().mockResolvedValue({
          id: "application-1",
          cvParseResult: {
            status: "COMPLETED",
            summary: "Ứng viên phù hợp.",
            errorMessage: null,
            structuredData: {
              confidence: 80,
              evidenceCoverage: 90,
              inputTruncated: true,
              cvSummary: {
                overview: "Frontend Engineer có kinh nghiệm React.",
                currentTitle: "Frontend Engineer",
                totalExperience: "4 năm",
                keySkills: ["React"],
                workCompanies: ["FPT Software"],
                workHighlights: ["Xây dashboard."],
                education: [],
                languages: ["Tiếng Anh"],
                notesForTa: ["CV có portfolio."],
              },
              aiInput: {
                selectedCharacters: 12000,
                omittedCharacters: 30000,
              },
            },
            updatedAt: new Date("2026-07-22T09:00:00.000Z"),
          },
          matchResult: {
            score: 75,
            strengths: ["React"],
            risks: [],
            missingRequirements: [],
            screeningQuestions: [],
          },
        }),
      },
    };
    const service = new CandidatesService(
      prisma as unknown as PrismaService,
      {} as CvStorageService,
      { enqueue: jest.fn() } as never,
    );

    await expect(service.getApplicationAnalysis("application-1")).resolves.toEqual({
      applicationId: "application-1",
      status: "COMPLETED",
      summary: "Ứng viên phù hợp.",
      cvSummary: {
        overview: "Frontend Engineer có kinh nghiệm React.",
        currentTitle: "Frontend Engineer",
        totalExperience: "4 năm",
        keySkills: ["React"],
        workExperiences: [],
        workCompanies: ["FPT Software"],
        workHighlights: ["Xây dashboard."],
        education: [],
        languages: ["Tiếng Anh"],
        notesForTa: ["CV có portfolio."],
      },
      errorMessage: null,
      confidence: 80,
      analysisSignals: {
        confidence: 80,
        evidenceCoverage: 90,
        inputTruncated: true,
        lowConfidenceOcr: false,
        ocrTruncated: false,
        aiInput: {
          selectedCharacters: 12000,
          omittedCharacters: 30000,
        },
      },
      updatedAt: new Date("2026-07-22T09:00:00.000Z"),
      matchResult: expect.objectContaining({ score: 75 }),
    });
    expect(prisma.application.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({
        cvParseResult: expect.objectContaining({
          select: expect.not.objectContaining({ extractedText: true }),
        }),
      }),
    }));
  });

  it("does not overwrite application status when only the TA note changes", async () => {
    const application = {
      id: "application-1",
      candidateId: "candidate-1",
      jobId: "job-1",
      submittedFullName: "Candidate",
      job: { title: "Frontend Engineer" },
    };
    const applicationUpdate = jest
      .fn()
      .mockResolvedValue({ ...application, hrNotes: "Strong profile" });
    const activityCreate = jest.fn().mockResolvedValue({});
    const transactionClient = {
      application: { update: applicationUpdate },
      followUpTask: { upsert: jest.fn(), deleteMany: jest.fn() },
      activityLog: { create: activityCreate },
    };
    const prisma = {
      application: { findUnique: jest.fn().mockResolvedValue(application) },
      $transaction: jest.fn(
        (callback: (tx: typeof transactionClient) => unknown) =>
          callback(transactionClient),
      ),
    };
    const service = new CandidatesService(
      prisma as unknown as PrismaService,
      {} as CvStorageService,
      { enqueue: jest.fn() } as never,
    );

    await service.updateApplication("application-1", {
      note: " Strong profile ",
    });

    expect(applicationUpdate).toHaveBeenCalledWith({
      where: { id: "application-1" },
      data: { status: undefined, hrNotes: "Strong profile" },
    });
    expect(activityCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "application_details_updated",
          metadata: expect.objectContaining({ noteUpdated: true }),
        }),
      }),
    );
  });

  it("resets analysis state and enqueues AI retry", async () => {
    const prisma = {
      application: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({
            id: "application-1",
            files: [{ id: "file-1", originalName: "candidate.pdf" }],
          })
          .mockResolvedValueOnce({
            id: "application-1",
            cvParseResult: {
              status: "PENDING",
              summary: "Hồ sơ đang chờ trích xuất lại nội dung CV.",
              errorMessage: null,
              structuredData: {},
              updatedAt: new Date("2026-07-22T09:00:00.000Z"),
            },
            matchResult: null,
          }),
      },
      cvParseResult: {
        upsert: jest.fn().mockResolvedValue(undefined),
      },
    };
    const queue = { enqueue: jest.fn().mockResolvedValue(true) };
    const service = new CandidatesService(
      prisma as unknown as PrismaService,
      {} as CvStorageService,
      queue as never,
    );

    await expect(service.retryApplicationAnalysis("application-1")).resolves.toMatchObject({
      applicationId: "application-1",
      status: "PENDING",
    });
    expect(prisma.cvParseResult.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ candidateFileId: "file-1", status: "PENDING" }),
    }));
    expect(queue.enqueue).toHaveBeenCalledWith("application-1", { force: true });
  });
});
