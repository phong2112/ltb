import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { PDFParse } from "pdf-parse";
import { createWorker, OEM } from "tesseract.js";

const OCR_LANGUAGES = ["vie", "eng"] as const;
const OCR_PDF_SCALE = 2;

export type OcrTextResult = {
  text: string;
  pages: number;
  confidence: number;
};

@Injectable()
export class CvOcrService {
  private readonly logger = new Logger(CvOcrService.name);

  constructor(private readonly configService: ConfigService) {}

  async recognizeImage(buffer: Buffer): Promise<OcrTextResult> {
    return this.recognizeImages([buffer]);
  }

  async recognizePdf(buffer: Buffer): Promise<OcrTextResult> {
    const parser = new PDFParse({ data: buffer });
    const maxPages = this.configService.get<number>("OCR_MAX_PAGES") ?? 10;

    try {
      const info = await parser.getInfo();

      if (info.total > maxPages) {
        throw new Error(`OCR supports at most ${maxPages} PDF pages`);
      }

      const screenshots = await parser.getScreenshot({
        first: info.total,
        scale: OCR_PDF_SCALE,
        imageBuffer: true,
        imageDataUrl: false,
      });

      return this.recognizeImages(
        screenshots.pages.map((page) => Buffer.from(page.data)),
      );
    } finally {
      await parser.destroy();
    }
  }

  private async recognizeImages(images: Buffer[]): Promise<OcrTextResult> {
    if (images.length === 0) {
      throw new Error("OCR did not receive any image pages");
    }

    const timeoutMs = this.configService.get<number>("OCR_TIMEOUT_MS") ?? 120_000;
    const languagePath = await prepareOcrLanguages();
    const worker = await createWorker(OCR_LANGUAGES.join("+"), OEM.LSTM_ONLY, {
      cacheMethod: "none",
      gzip: true,
      langPath: languagePath,
    });
    const texts: string[] = [];
    const confidences: number[] = [];

    try {
      await worker.setParameters({
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });

      for (const [index, image] of images.entries()) {
        this.logger.log(`OCR processing page ${index + 1}/${images.length}`);
        const result = await withTimeout(
          worker.recognize(image, { rotateAuto: true }),
          timeoutMs,
          `OCR timed out while processing page ${index + 1}`,
        );
        texts.push(result.data.text);
        confidences.push(result.data.confidence);
      }
    } finally {
      await worker.terminate();
    }

    return {
      text: texts.join("\n\n"),
      pages: images.length,
      confidence: Math.round(
        confidences.reduce((sum, confidence) => sum + confidence, 0) /
          confidences.length,
      ),
    };
  }
}

let languagePathPromise: Promise<string> | undefined;

function prepareOcrLanguages() {
  languagePathPromise ??= prepareOcrLanguageDirectory();
  return languagePathPromise;
}

async function prepareOcrLanguageDirectory() {
  const languagePath = join(tmpdir(), "ltb-tesseract-data-v1");
  await mkdir(languagePath, { recursive: true });

  await Promise.all(OCR_LANGUAGES.map(async (code) => {
    const packageRoot = dirname(
      require.resolve(`@tesseract.js-data/${code}/package.json`),
    );
    await copyFile(
      join(packageRoot, "4.0.0_best_int", `${code}.traineddata.gz`),
      join(languagePath, `${code}.traineddata.gz`),
    );
  }));

  return languagePath;
}

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  message: string,
) {
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
