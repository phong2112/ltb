import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { PDFParse } from "pdf-parse";
import { createWorker, OEM, type Worker } from "tesseract.js";

const OCR_LANGUAGES = ["vie", "eng"] as const;
type OcrLanguage = (typeof OCR_LANGUAGES)[number];

const OCR_LANGUAGE_PACKAGE_JSON: Record<OcrLanguage, string> = {
  vie: require.resolve("@tesseract.js-data/vie/package.json"),
  eng: require.resolve("@tesseract.js-data/eng/package.json"),
};

const OCR_PDF_SCALE = 2;
const OCR_PDF_HARD_PAGE_LIMIT = 30;

export type OcrTextResult = {
  text: string;
  pages: number;
  confidence: number;
  truncatedPages?: boolean;
  totalPages?: number;
};

@Injectable()
export class CvOcrService implements OnModuleDestroy {
  private readonly logger = new Logger(CvOcrService.name);
  private workerPromise?: Promise<Worker>;
  private workerQueue: Promise<void> = Promise.resolve();

  constructor(private readonly configService: ConfigService) {}

  async recognizeImage(buffer: Buffer): Promise<OcrTextResult> {
    return this.recognizeImages([buffer]);
  }

  async recognizePdf(buffer: Buffer): Promise<OcrTextResult> {
    const parser = new PDFParse({ data: buffer });
    const maxPages = this.configService.get<number>("OCR_MAX_PAGES") ?? 10;

    try {
      const info = await parser.getInfo();

      if (info.total > OCR_PDF_HARD_PAGE_LIMIT) {
        throw new Error(`OCR refuses PDFs over ${OCR_PDF_HARD_PAGE_LIMIT} pages`);
      }

      const pages = Math.min(info.total, maxPages);

      const screenshots = await parser.getScreenshot({
        first: pages,
        scale: OCR_PDF_SCALE,
        imageBuffer: true,
        imageDataUrl: false,
      });

      const result = await this.recognizeImages(
        screenshots.pages.map((page) => Buffer.from(page.data)),
      );

      return {
        ...result,
        totalPages: info.total,
        ...(info.total > pages ? { truncatedPages: true } : {}),
      };
    } finally {
      await parser.destroy();
    }
  }

  async onModuleDestroy() {
    await this.workerQueue;
    const workerPromise = this.workerPromise;
    this.workerPromise = undefined;
    const worker = await workerPromise?.catch(() => undefined);
    await worker?.terminate();
  }

  private async recognizeImages(images: Buffer[]): Promise<OcrTextResult> {
    if (images.length === 0) {
      throw new Error("OCR did not receive any image pages");
    }

    const timeoutMs = this.configService.get<number>("OCR_TIMEOUT_MS") ?? 120_000;
    return this.withWorker(async (worker) => {
      const texts: string[] = [];
      const confidences: number[] = [];

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

      return {
        text: texts.join("\n\n"),
        pages: images.length,
        confidence: Math.round(
          confidences.reduce((sum, confidence) => sum + confidence, 0) /
            confidences.length,
        ),
      };
    });
  }

  private async getWorker() {
    this.workerPromise ??= this.createConfiguredWorker().catch((error: unknown) => {
      this.workerPromise = undefined;
      throw error;
    });
    return this.workerPromise;
  }

  private async createConfiguredWorker() {
    const languagePath = await prepareOcrLanguages();
    const worker = await createWorker(OCR_LANGUAGES.join("+"), OEM.LSTM_ONLY, {
      cacheMethod: "none",
      gzip: true,
      langPath: languagePath,
    });
    try {
      await worker.setParameters({
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });
      return worker;
    } catch (error) {
      await worker.terminate().catch(() => undefined);
      throw error;
    }
  }

  private withWorker<T>(operation: (worker: Worker) => Promise<T>): Promise<T> {
    const run = this.workerQueue.then(async () => {
      const worker = await this.getWorker();
      try {
        return await operation(worker);
      } catch (error) {
        await this.discardWorker(worker);
        throw error;
      }
    });

    this.workerQueue = run.then(() => undefined, () => undefined);
    return run;
  }

  private async discardWorker(worker: Worker) {
    const currentWorker = await this.workerPromise?.catch(() => undefined);
    if (currentWorker !== worker) return;

    this.workerPromise = undefined;
    await worker.terminate().catch(() => undefined);
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
      OCR_LANGUAGE_PACKAGE_JSON[code],
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
