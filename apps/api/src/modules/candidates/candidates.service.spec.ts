import type { PrismaService } from "../prisma/prisma.service";
import type { CvStorageService } from "../files/cv-storage.service";
import { CandidatesService } from "./candidates.service";

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
            structuredData: { confidence: 80 },
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
    );

    await expect(service.getApplicationAnalysis("application-1")).resolves.toEqual({
      applicationId: "application-1",
      status: "COMPLETED",
      summary: "Ứng viên phù hợp.",
      errorMessage: null,
      confidence: 80,
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
});
