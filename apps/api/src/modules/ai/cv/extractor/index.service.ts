import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as mammoth from "mammoth";
import { extname } from "node:path";
import { PDFParse } from "pdf-parse";
import WordExtractor = require("word-extractor");
import { CvStorageService } from "@/modules/files/storage/index.service";
import { calculateTextQuality, cleanExtractedCvText } from "@/modules/ai/cv/cleaner";
import { CvOcrService } from "@/modules/ai/cv/ocr/index.service";

export type CandidateFileForExtraction = {
  originalName: string;
  mimeType: string;
  path?: string;
  buffer?: Buffer;
};

export type ExtractedCvText = {
  text: string;
  parser: "pdf-parse" | "mammoth" | "word-extractor" | "tesseract-ocr";
  ocrPages?: number;
  ocrConfidence?: number;
  ocrTruncated?: boolean;
  totalPages?: number;
  lowConfidenceOcr?: boolean;
  qualityScore?: number;
};

const MIN_READABLE_TEXT_CHARACTERS = 40;
const MIN_PDF_TEXT_CHARACTERS_PER_PAGE = 200;
const MAX_GIBBERISH_CHARACTER_RATIO = 0.05;
const DEFAULT_OCR_MIN_CONFIDENCE = 55;

@Injectable()
export class CvTextExtractorService {
  constructor(
    private readonly configService: ConfigService,
    private readonly cvStorageService: CvStorageService,
    private readonly cvOcrService: CvOcrService,
  ) {}

  async extract(file: CandidateFileForExtraction): Promise<ExtractedCvText> {
    const maxSizeMb = this.configService.get<number>("MAX_CV_FILE_SIZE_MB") ?? 10;
    const buffer = file.buffer ?? await this.readStoredFile(file, maxSizeMb);
    const extension = extname(file.originalName).toLowerCase();

    let result: ExtractedCvText;

    if (extension === ".pdf" || file.mimeType === "application/pdf") {
      const pdf = await extractPdf(buffer);
      const pdfText = cleanExtractedCvText(pdf.text);
      const shouldTryOcr = shouldOcrPdf(pdfText, pdf.pageCount);

      if (!shouldTryOcr) {
        result = { text: pdfText, parser: "pdf-parse" };
      } else {
        try {
          const ocr = await this.cvOcrService.recognizePdf(buffer);
          const ocrText = cleanExtractedCvText(ocr.text);

          if (shouldPreferOcr(pdfText, ocrText)) {
            result = this.toOcrExtractedText(ocrText, ocr);
          } else {
            result = { text: pdfText, parser: "pdf-parse" };
          }
        } catch (error) {
          if (!hasEnoughText(pdfText)) throw error;
          result = { text: pdfText, parser: "pdf-parse" };
        }
      }
    } else if (extension === ".docx") {
      const extracted = await mammoth.extractRawText({ buffer });
      result = { text: extracted.value, parser: "mammoth" };
    } else if (extension === ".doc") {
      const extractor = new WordExtractor();
      const extracted = await extractor.extract(buffer);
      result = { text: extracted.getBody(), parser: "word-extractor" };
    } else if (isSupportedImage(extension, file.mimeType)) {
      const ocr = await this.cvOcrService.recognizeImage(buffer);
      result = this.toOcrExtractedText(ocr.text, ocr);
    } else {
      throw new Error("Unsupported CV format");
    }

    const normalizedText = cleanExtractedCvText(result.text);

    if (!hasEnoughText(normalizedText)) {
      throw new Error("CV does not contain enough readable text after OCR");
    }

    return {
      ...result,
      text: normalizedText,
      qualityScore: calculateTextQuality(normalizedText),
    };
  }

  private async readStoredFile(file: CandidateFileForExtraction, maxSizeMb: number) {
    if (!file.path) {
      throw new Error("CV path or buffer is required for extraction");
    }

    const opened = await this.cvStorageService.openCandidateCv(file.path, file.mimeType);
    return readStreamToBuffer(opened.stream, maxSizeMb * 1024 * 1024);
  }

  private toOcrExtractedText(
    text: string,
    ocr: Awaited<ReturnType<CvOcrService["recognizePdf"]>>,
  ): ExtractedCvText {
    const minConfidence = this.configService.get<number>("OCR_MIN_CONFIDENCE")
      ?? DEFAULT_OCR_MIN_CONFIDENCE;

    return {
      text,
      parser: "tesseract-ocr",
      ocrPages: ocr.pages,
      ocrConfidence: ocr.confidence,
      ...(ocr.truncatedPages ? { ocrTruncated: true } : {}),
      ...(ocr.totalPages === undefined ? {} : { totalPages: ocr.totalPages }),
      ...(ocr.confidence < minConfidence ? { lowConfidenceOcr: true } : {}),
    };
  }
}

function hasEnoughText(value: string) {
  return value.length >= MIN_READABLE_TEXT_CHARACTERS;
}

function shouldOcrPdf(text: string, pageCount: number) {
  if (!hasEnoughText(text) || isLikelyGibberish(text)) return true;
  return text.length / Math.max(pageCount, 1) < MIN_PDF_TEXT_CHARACTERS_PER_PAGE;
}

function isLikelyGibberish(value: string) {
  if (!value) return false;
  const suspicious = value.match(/[\uFFFD\u0001-\u0008\u000B\u000C\u000E-\u001F]/gu)?.length ?? 0;
  return suspicious / value.length > MAX_GIBBERISH_CHARACTER_RATIO;
}

function shouldPreferOcr(pdfText: string, ocrText: string) {
  if (!hasEnoughText(pdfText) || isLikelyGibberish(pdfText)) return hasEnoughText(ocrText);
  if (!hasEnoughText(ocrText)) return false;

  const pdfQuality = calculateTextQuality(pdfText);
  const ocrQuality = calculateTextQuality(ocrText);
  const ocrIsSubstantiallyLonger = ocrText.length >= pdfText.length * 1.25;
  const ocrIsNotMateriallyWorse = ocrQuality >= pdfQuality - 8;
  const ocrIsClearlyCleaner = ocrQuality >= pdfQuality + 10 && ocrText.length >= pdfText.length * 0.75;

  return ocrIsClearlyCleaner || (ocrIsSubstantiallyLonger && ocrIsNotMateriallyWorse);
}

function isSupportedImage(extension: string, mimeType: string) {
  return [".jpg", ".jpeg", ".png"].includes(extension) || ["image/jpeg", "image/png"].includes(mimeType);
}

async function extractPdf(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });

  try {
    const info = await parser.getInfo();
    const result = await parser.getText();
    return { text: result.text, pageCount: Math.max(info.total, 1) };
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
