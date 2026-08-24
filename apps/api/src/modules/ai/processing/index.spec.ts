jest.mock("sanitize-html", () => ({
  __esModule: true,
  default: (value: string) => value.replace(/<[^>]+>/g, ""),
}));

import type { PrismaService } from "../../prisma";
import type { CvTextExtractorService } from "../cv/extractor/index.service";
import type { AiProvider } from "../../../models/ai";
import { AiService } from "./index.service";

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
        text: "Nguyen Van Candidate\ncandidate@example.com\nFrontend Engineer with five years of React experience.\nWork Experience\nJan 2020 – Nov 2022 FPT Software",
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
      planSourcing: jest.fn(),
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
    expect(provider.summarizeCv).toHaveBeenCalledWith(expect.objectContaining({
      cvText: expect.stringContaining("Jan 2020 – Nov 2022 FPT Software"),
    }));
    expect(provider.summarizeCv).toHaveBeenCalledWith(expect.objectContaining({
      cvText: expect.not.stringContaining("CV_INPUT_DA_CHUAN_HOA"),
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
    expect(cvParseUpdate.mock.calls.map(([input]) => input.data.status).filter(Boolean)).toEqual([
      "EXTRACTING",
      "EXTRACTED",
      "ANALYZING",
      "COMPLETED",
    ]);
  });

  it("persists the CV summary before match analysis so a provider failure does not lose it", async () => {
    const application = {
      id: "application-summary",
      candidateId: "candidate-1",
      jobId: "job-1",
      submittedFullName: "Nguyen Van Candidate",
      job: {
        title: "Backend Engineer",
        description: "Build APIs",
        requirements: "- Node.js bắt buộc",
      },
      cvParseResult: {
        candidateFileId: "file-1",
        extractedText: "Backend Engineer with Node.js experience.",
        structuredData: { parser: "pdf-parse" },
      },
    };
    const cvParseUpdate = jest.fn().mockResolvedValue({});
    const prisma = {
      application: { findUnique: jest.fn().mockResolvedValue(application) },
      cvParseResult: { update: cvParseUpdate },
    };
    const provider: AiProvider = {
      name: "mock",
      model: "mock-model",
      analyzeMatch: jest.fn().mockRejectedValue(new Error("quota exceeded")),
      summarizeCv: jest.fn().mockResolvedValue({
        overview: "Backend Engineer có kinh nghiệm Node.js.",
        currentTitle: "Backend Engineer",
        totalExperience: "3 năm",
        keySkills: ["Node.js"],
        workCompanies: [],
        workHighlights: [],
        education: [],
        languages: [],
        notesForTa: [],
      }),
      extractProfile: jest.fn(),
      planSourcing: jest.fn(),
    };
    const service = new AiService(
      prisma as unknown as PrismaService,
      {} as CvTextExtractorService,
      provider,
    );

    await expect(service.analyzeApplication("application-summary")).rejects.toThrow("quota exceeded");

    expect(cvParseUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        structuredData: expect.objectContaining({
          cvSummary: expect.objectContaining({ overview: "Backend Engineer có kinh nghiệm Node.js." }),
        }),
      }),
    }));
  });
});
