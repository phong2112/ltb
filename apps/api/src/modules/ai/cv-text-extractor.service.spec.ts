import { Readable } from "node:stream";
import type { ConfigService } from "@nestjs/config";
import type { CvStorageService } from "../files/cv-storage.service";
import type { CvOcrService } from "./cv-ocr.service";
import { CvTextExtractorService } from "./cv-text-extractor.service";

const mockGetText = jest.fn();
const mockGetInfo = jest.fn();
const mockDestroy = jest.fn().mockResolvedValue(undefined);

jest.mock("pdf-parse", () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: mockGetText,
    getInfo: mockGetInfo,
    destroy: mockDestroy,
  })),
}));

describe("CvTextExtractorService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetInfo.mockResolvedValue({ total: 1 });
  });

  it("keeps normal PDF text extraction when enough text is available", async () => {
    mockGetText.mockResolvedValue({
      text: "Frontend engineer with five years of React and TypeScript experience. ".repeat(4),
    });
    const ocr = createOcrMock();
    const service = createService(Buffer.from("%PDF"), ocr);

    await expect(service.extract({
      originalName: "candidate.pdf",
      mimeType: "application/pdf",
      path: "cv/candidate.pdf",
    })).resolves.toEqual({
      text: "Frontend engineer with five years of React and TypeScript experience. ".repeat(4).trim(),
      parser: "pdf-parse",
    });
    expect(ocr.recognizePdf).not.toHaveBeenCalled();
  });

  it("tries OCR when PDF text density is low and chooses the longer OCR source", async () => {
    mockGetInfo.mockResolvedValue({ total: 2 });
    mockGetText.mockResolvedValue({ text: "Nguyễn Văn A\nFrontend Engineer\nEmail: candidate@example.com" });
    const ocr = createOcrMock({
      text: "Nguyễn Văn A là kỹ sư phần mềm có năm năm kinh nghiệm React, TypeScript, Node.js và xây dựng sản phẩm web.",
    });
    const service = createService(Buffer.from("%PDF"), ocr);

    await expect(service.extract({
      originalName: "hybrid.pdf",
      mimeType: "application/pdf",
      path: "cv/hybrid.pdf",
    })).resolves.toMatchObject({
      parser: "tesseract-ocr",
      text: expect.stringContaining("năm năm kinh nghiệm"),
    });
    expect(ocr.recognizePdf).toHaveBeenCalledTimes(1);
  });

  it("keeps usable PDF text when speculative OCR returns less meaningful text", async () => {
    mockGetInfo.mockResolvedValue({ total: 2 });
    const pdfText = "Frontend engineer có kinh nghiệm React, TypeScript và kiểm thử ứng dụng web.";
    mockGetText.mockResolvedValue({ text: pdfText });
    const ocr = createOcrMock({ text: "Không đọc rõ nội dung CV này." });
    const service = createService(Buffer.from("%PDF"), ocr);

    await expect(service.extract({
      originalName: "thin-text.pdf",
      mimeType: "application/pdf",
      path: "cv/thin-text.pdf",
    })).resolves.toEqual({ text: pdfText, parser: "pdf-parse" });
  });

  it("propagates OCR truncation and low-confidence metadata", async () => {
    mockGetText.mockResolvedValue({ text: " " });
    const ocr = createOcrMock({
      confidence: 42,
      truncatedPages: true,
      totalPages: 12,
    });
    const service = createService(Buffer.from("%PDF"), ocr, {
      OCR_MIN_CONFIDENCE: 55,
    });

    await expect(service.extract({
      originalName: "long-scan.pdf",
      mimeType: "application/pdf",
      path: "cv/long-scan.pdf",
    })).resolves.toMatchObject({
      parser: "tesseract-ocr",
      ocrTruncated: true,
      totalPages: 12,
      lowConfidenceOcr: true,
    });
  });

  it("falls back to OCR when a scanned PDF has no usable text layer", async () => {
    mockGetText.mockResolvedValue({ text: " " });
    const ocr = createOcrMock();
    const service = createService(Buffer.from("%PDF"), ocr);

    await expect(service.extract({
      originalName: "scanned-cv.pdf",
      mimeType: "application/pdf",
      path: "cv/scanned-cv.pdf",
    })).resolves.toEqual({
      text: "Kỹ sư phần mềm có năm năm kinh nghiệm React và TypeScript.",
      parser: "tesseract-ocr",
      ocrPages: 2,
      ocrConfidence: 91,
    });
    expect(ocr.recognizePdf).toHaveBeenCalledWith(Buffer.from("%PDF"));
  });

  it("uses OCR directly for an uploaded CV image", async () => {
    const image = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const ocr = createOcrMock();
    const service = createService(image, ocr);

    await expect(service.extract({
      originalName: "candidate.png",
      mimeType: "image/png",
      path: "cv/candidate.png",
    })).resolves.toMatchObject({
      parser: "tesseract-ocr",
      ocrPages: 2,
      ocrConfidence: 91,
    });
    expect(ocr.recognizeImage).toHaveBeenCalledWith(image);
  });
});

function createService(
  buffer: Buffer,
  ocr: ReturnType<typeof createOcrMock>,
  values: Record<string, number> = {},
) {
  const config = {
    get: jest.fn((key: string) => values[key] ?? (key === "MAX_CV_FILE_SIZE_MB" ? 10 : undefined)),
  };
  const storage = {
    openCandidateCv: jest.fn().mockResolvedValue({ stream: Readable.from(buffer) }),
  };

  return new CvTextExtractorService(
    config as unknown as ConfigService,
    storage as unknown as CvStorageService,
    ocr as unknown as CvOcrService,
  );
}

function createOcrMock(overrides: Partial<{
  text: string;
  pages: number;
  confidence: number;
  truncatedPages: boolean;
  totalPages: number;
}> = {}) {
  const result = {
    text: "Kỹ sư phần mềm có năm năm kinh nghiệm React và TypeScript.",
    pages: 2,
    confidence: 91,
    ...overrides,
  };

  return {
    recognizePdf: jest.fn().mockResolvedValue(result),
    recognizeImage: jest.fn().mockResolvedValue(result),
  };
}
