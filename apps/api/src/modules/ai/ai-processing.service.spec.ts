jest.mock("sanitize-html", () => ({
  __esModule: true,
  default: (value: string) => value.replace(/<[^>]+>/g, ""),
}));

import type { PrismaService } from "../prisma/prisma.service";
import { AiService } from "./ai.service";
import type { AiProvider } from "./ai.types";
import type { CvTextExtractorService } from "./cv-text-extractor.service";

describe("AiService", () => {
  it("uses provider evidence but calculates and persists the final score itself", async () => {
    const application = {
      id: "application-1",
      candidateId: "candidate-1",
      jobId: "job-1",
      job: {
        title: "Frontend Engineer",
        description: "Build accessible web products",
        requirements: "- React bắt buộc\n- TypeScript bắt buộc",
      },
      files: [{
        id: "file-1",
        applicationId: "application-1",
        kind: "CV",
        originalName: "candidate.pdf",
        storedName: "candidate.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
        path: "/private/candidate.pdf",
        createdAt: new Date(),
      }],
    };
    const cvParseUpdate = jest.fn().mockResolvedValue({});
    const matchUpsert = jest.fn().mockResolvedValue({});
    const activityCreate = jest.fn().mockResolvedValue({});
    const prisma = {
      application: { findUnique: jest.fn().mockResolvedValue(application) },
      cvParseResult: { update: cvParseUpdate },
      matchResult: { upsert: matchUpsert },
      activityLog: { create: activityCreate },
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    };
    const textExtractor = {
      extract: jest.fn().mockResolvedValue({
        text: "Frontend Engineer with five years of React experience.",
        parser: "pdf-parse",
      }),
    };
    const provider: AiProvider = {
      name: "mock",
      model: "mock-model",
      analyzeMatch: jest.fn().mockResolvedValue({
        profile: { currentRole: "Frontend Engineer", totalYearsExperience: 5, skills: ["React"], languages: [] },
        summary: "Ứng viên phù hợp một phần.",
        evaluations: [
          { criterionId: "criterion-1", status: "met", evidence: ["five years of React"], reason: "Có React" },
          { criterionId: "criterion-2", status: "unknown", evidence: [], reason: "Không thấy TypeScript" },
        ],
        strengths: ["Có kinh nghiệm React"],
        risks: ["Chưa đủ bằng chứng TypeScript"],
        screeningQuestions: ["Bạn đã dùng TypeScript trong dự án nào?"],
      }),
    };
    const service = new AiService(
      prisma as unknown as PrismaService,
      textExtractor as unknown as CvTextExtractorService,
      provider,
    );

    await service.processApplication("application-1");

    expect(provider.analyzeMatch).toHaveBeenCalledTimes(1);
    expect(matchUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ score: 50 }),
      update: expect.objectContaining({ score: 50 }),
    }));
    expect(cvParseUpdate).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "COMPLETED" }),
    }));
  });
});
