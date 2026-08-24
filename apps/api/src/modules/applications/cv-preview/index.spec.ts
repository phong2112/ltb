import { BadRequestException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { CvTextExtractorService } from "@/modules/ai/cv/extractor/index.service";
import type { ApplicationCvPreviewAiService } from "./ai.service";
import { ApplicationCvPreviewService } from "./index.service";

describe("ApplicationCvPreviewService", () => {
  it("extracts basic profile suggestions without returning raw CV text", async () => {
    const extractor = {
      extract: jest.fn().mockResolvedValue({
        text: [
          "Nguyễn Văn A",
          "Frontend Engineer",
          "Email: a.nguyen@example.com",
          "Phone: 0901 234 567",
          "Address: Ha Noi",
        ].join("\n"),
        parser: "pdf-parse",
        qualityScore: 92,
      }),
    };
    const service = new ApplicationCvPreviewService(
      createConfigService(),
      extractor as unknown as CvTextExtractorService,
      createPreviewAiService(),
    );

    const result = await service.preview(createPdfFile(), { allowedApplicationAreas: ["Hà Nội"] });

    expect(result).toEqual({
      profile: {
        fullName: "Nguyễn Văn A",
        title: "Frontend Engineer",
        email: "a.nguyen@example.com",
        phone: "0901 234 567",
        normalizedPhone: "0901234567",
        applicationArea: "Hà Nội",
      },
      metadata: {
        parser: "pdf-parse",
        qualityScore: 92,
        profileSource: "regex",
      },
    });
    expect(JSON.stringify(result)).not.toContain("Phone:");
    expect(extractor.extract).toHaveBeenCalledWith(expect.objectContaining({
      originalName: "candidate.pdf",
      mimeType: "application/pdf",
      buffer: expect.any(Buffer),
    }));
  });

  it("uses high-confidence Gemini preview output for contextual fields", async () => {
    const extractor = {
      extract: jest.fn().mockResolvedValue({
        text: [
          "Ho Chi Minh University",
          "Open to work in Ha Noi",
          "Email: candidate@example.com",
        ].join("\n"),
        parser: "pdf-parse",
        qualityScore: 88,
      }),
    };
    const previewAi = createPreviewAiService({
      fullName: "Nguyễn Văn B",
      email: null,
      phone: null,
      linkedinUrl: "https://www.linkedin.com/in/nguyen-van-b",
      applicationArea: "Hà Nội",
      confidence: {
        fullName: 0.92,
        email: 0,
        phone: 0,
        linkedinUrl: 0.88,
        applicationArea: 0.82,
      },
      evidence: {
        fullName: "Nguyễn Văn B",
        email: null,
        phone: null,
        linkedinUrl: "LinkedIn profile",
        applicationArea: "Open to work in Ha Noi",
      },
    });
    const service = new ApplicationCvPreviewService(
      createConfigService(),
      extractor as unknown as CvTextExtractorService,
      previewAi,
    );

    const result = await service.preview(createPdfFile(), { allowedApplicationAreas: ["Hà Nội", "TP Hồ Chí Minh"] });

    expect(result.profile).toMatchObject({
      fullName: "Nguyễn Văn B",
      email: "candidate@example.com",
      linkedinUrl: "https://www.linkedin.com/in/nguyen-van-b",
      applicationArea: "Hà Nội",
    });
    expect(result.metadata.profileSource).toBe("regex+gemini");
  });

  it("rejects missing or invalid files before extraction", async () => {
    const extractor = { extract: jest.fn() };
    const service = new ApplicationCvPreviewService(
      createConfigService(),
      extractor as unknown as CvTextExtractorService,
      createPreviewAiService(),
    );

    await expect(service.preview()).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.preview({
      ...createPdfFile(),
      buffer: Buffer.from("not a pdf"),
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(extractor.extract).not.toHaveBeenCalled();
  });

  it("returns a bad request when extraction cannot read the CV", async () => {
    const extractor = {
      extract: jest.fn().mockRejectedValue(new Error("CV does not contain enough readable text")),
    };
    const service = new ApplicationCvPreviewService(
      createConfigService(),
      extractor as unknown as CvTextExtractorService,
      createPreviewAiService(),
    );

    await expect(service.preview(createPdfFile())).rejects.toBeInstanceOf(BadRequestException);
  });
});

function createConfigService() {
  return {
    get: jest.fn((key: string) => key === "MAX_CV_FILE_SIZE_MB" ? 10 : undefined),
  } as unknown as ConfigService;
}

function createPreviewAiService(result: Awaited<ReturnType<ApplicationCvPreviewAiService["extract"]>> = null) {
  return {
    extract: jest.fn().mockResolvedValue(result),
  } as unknown as ApplicationCvPreviewAiService;
}

function createPdfFile() {
  return {
    originalname: "candidate.pdf",
    mimetype: "application/pdf",
    size: 12,
    buffer: Buffer.from("%PDF-1.7"),
  } as Express.Multer.File;
}
