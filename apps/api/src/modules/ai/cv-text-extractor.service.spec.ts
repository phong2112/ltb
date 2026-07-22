import { Readable } from "node:stream";
import type { ConfigService } from "@nestjs/config";
import type { CvStorageService } from "../files/cv-storage.service";
import type { CvOcrService } from "./cv-ocr.service";
import { CvTextExtractorService } from "./cv-text-extractor.service";

const mockGetText = jest.fn();
const mockDestroy = jest.fn().mockResolvedValue(undefined);

jest.mock("pdf-parse", () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: mockGetText,
    destroy: mockDestroy,
  })),
}));

describe("CvTextExtractorService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps normal PDF text extraction when enough text is available", async () => {
    mockGetText.mockResolvedValue({
      text: "Frontend engineer with five years of React and TypeScript experience.",
    });
    const ocr = createOcrMock();
    const service = createService(Buffer.from("%PDF"), ocr);

    await expect(service.extract({
      originalName: "candidate.pdf",
      mimeType: "application/pdf",
      path: "cv/candidate.pdf",
    })).resolves.toEqual({
      text: "Frontend engineer with five years of React and TypeScript experience.",
      parser: "pdf-parse",
    });
    expect(ocr.recognizePdf).not.toHaveBeenCalled();
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

function createService(buffer: Buffer, ocr: ReturnType<typeof createOcrMock>) {
  const config = {
    get: jest.fn().mockReturnValue(10),
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

function createOcrMock() {
  const result = {
    text: "Kỹ sư phần mềm có năm năm kinh nghiệm React và TypeScript.",
    pages: 2,
    confidence: 91,
  };

  return {
    recognizePdf: jest.fn().mockResolvedValue(result),
    recognizeImage: jest.fn().mockResolvedValue(result),
  };
}
