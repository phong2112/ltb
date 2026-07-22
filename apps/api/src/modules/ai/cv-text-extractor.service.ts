import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as mammoth from "mammoth";
import { extname } from "node:path";
import { PDFParse } from "pdf-parse";
import WordExtractor = require("word-extractor");
import { CvStorageService } from "../files/cv-storage.service";
import { CvOcrService } from "./cv-ocr.service";

export type CandidateFileForExtraction = {
  originalName: string;
  mimeType: string;
  path: string;
};

export type ExtractedCvText = {
  text: string;
  parser: "pdf-parse" | "mammoth" | "word-extractor" | "tesseract-ocr";
  ocrPages?: number;
  ocrConfidence?: number;
};

@Injectable()
export class CvTextExtractorService {
  constructor(
    private readonly configService: ConfigService,
    private readonly cvStorageService: CvStorageService,
    private readonly cvOcrService: CvOcrService,
  ) {}

  async extract(file: CandidateFileForExtraction): Promise<ExtractedCvText> {
    const opened = await this.cvStorageService.openCandidateCv(file.path, file.mimeType);
    const maxSizeMb = this.configService.get<number>("MAX_CV_FILE_SIZE_MB") ?? 10;
    const buffer = await readStreamToBuffer(opened.stream, maxSizeMb * 1024 * 1024);
    const extension = extname(file.originalName).toLowerCase();

    let result: ExtractedCvText;

    if (extension === ".pdf" || file.mimeType === "application/pdf") {
      const pdfText = normalizeExtractedText(await extractPdf(buffer));

      if (hasEnoughText(pdfText)) {
        return { text: pdfText, parser: "pdf-parse" };
      }

      const ocr = await this.cvOcrService.recognizePdf(buffer);
      result = {
        text: ocr.text,
        parser: "tesseract-ocr",
        ocrPages: ocr.pages,
        ocrConfidence: ocr.confidence,
      };
    } else if (extension === ".docx") {
      const extracted = await mammoth.extractRawText({ buffer });
      result = { text: extracted.value, parser: "mammoth" };
    } else if (extension === ".doc") {
      const extractor = new WordExtractor();
      const extracted = await extractor.extract(buffer);
      result = { text: extracted.getBody(), parser: "word-extractor" };
    } else if (isSupportedImage(extension, file.mimeType)) {
      const ocr = await this.cvOcrService.recognizeImage(buffer);
      result = {
        text: ocr.text,
        parser: "tesseract-ocr",
        ocrPages: ocr.pages,
        ocrConfidence: ocr.confidence,
      };
    } else {
      throw new Error("Unsupported CV format");
    }

    const normalizedText = normalizeExtractedText(result.text);

    if (!hasEnoughText(normalizedText)) {
      throw new Error("CV does not contain enough readable text after OCR");
    }

    return { ...result, text: normalizedText };
  }
}

function hasEnoughText(value: string) {
  return value.length >= 40;
}

function isSupportedImage(extension: string, mimeType: string) {
  return [".jpg", ".jpeg", ".png"].includes(extension) || ["image/jpeg", "image/png"].includes(mimeType);
}

async function extractPdf(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function readStreamToBuffer(stream: NodeJS.ReadableStream, maxBytes: number) {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk)
      ? chunk
      : typeof chunk === "string"
        ? Buffer.from(chunk)
        : Buffer.from(chunk as unknown as Uint8Array);
    totalBytes += buffer.length;

    if (totalBytes > maxBytes) {
      throw new Error("CV exceeds the configured extraction size limit");
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

function normalizeExtractedText(value: string) {
  return value
    .replace(/\u0000/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
