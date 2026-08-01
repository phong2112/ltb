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
      submittedFullName: "Nguyen Van Candidate",
      job: {
        title: "Frontend Engineer",
        description: "Build accessible web products",
        requirements: "- React bắt buộc\n- TypeScript bắt buộc",
      },
      cvParseResult: {
        structuredData: { lowConfidenceOcr: true },
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
        text: "Nguyen Van Candidate\ncandidate@example.com\nFrontend Engineer with five years of React experience.",
        parser: "tesseract-ocr",
        ocrPages: 2,
        ocrConfidence: 42,
        lowConfidenceOcr: true,
      }),
    };
    const provider: AiProvider = {
      name: "mock",
      model: "mock-model",
      analyzeMatch: jest.fn().mockResolvedValue({
        summary: "Ứng viên phù hợp một phần.",
        evaluations: [
          { criterionId: "criterion-1", status: "met", evidence: ["five years of React"], reason: "Có React" },
          { criterionId: "criterion-2", status: "unknown", evidence: [], reason: "Không thấy TypeScript" },
        ],
      }),
      summarizeCv: jest.fn().mockResolvedValue({
        overview: "Frontend Engineer có kinh nghiệm React.",
        currentTitle: "Frontend Engineer",
        totalExperience: "5 năm",
        keySkills: ["React"],
        workCompanies: [],
        workHighlights: ["Xây dựng sản phẩm web bằng React."],
        education: [],
        languages: [],
        notesForTa: ["CV không nêu TypeScript."],
      }),
      extractProfile: jest.fn(),
    };
    const service = new AiService(
      prisma as unknown as PrismaService,
      textExtractor as unknown as CvTextExtractorService,
      provider,
    );

    await service.processApplication("application-1");

    expect(provider.analyzeMatch).toHaveBeenCalledTimes(1);
    expect(provider.summarizeCv).toHaveBeenCalledTimes(1);
    expect(provider.summarizeCv).toHaveBeenCalledWith(expect.objectContaining({
      cvText: expect.not.stringContaining("candidate@example.com"),
    }));
    expect(provider.analyzeMatch).toHaveBeenCalledWith(expect.objectContaining({
      cvText: expect.not.stringContaining("candidate@example.com"),
    }));
    expect(provider.analyzeMatch).toHaveBeenCalledWith(expect.objectContaining({
      cvText: expect.not.stringContaining("Nguyen Van Candidate"),
    }));
    expect(matchUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        score: 50,
        risks: expect.arrayContaining(["OCR chất lượng thấp — nên kiểm tra thủ công."]),
      }),
      update: expect.objectContaining({
        score: 50,
        risks: expect.arrayContaining(["OCR chất lượng thấp — nên kiểm tra thủ công."]),
      }),
    }));
    expect(cvParseUpdate).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: "COMPLETED",
        summary: expect.stringContaining("OCR chất lượng thấp"),
      }),
    }));
    expect(cvParseUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        structuredData: expect.objectContaining({
          lowConfidenceOcr: true,
          ocrConfidence: 42,
        }),
      }),
    }));
    expect(cvParseUpdate).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        structuredData: expect.objectContaining({
          cvSummary: expect.objectContaining({
            overview: "Frontend Engineer có kinh nghiệm React.",
            keySkills: ["React"],
            workCompanies: [],
          }),
        }),
      }),
    }));
    expect(cvParseUpdate.mock.calls.map(([input]) => input.data.status)).toEqual([
      "EXTRACTING",
      "EXTRACTED",
      "ANALYZING",
      "COMPLETED",
    ]);
  });
});
