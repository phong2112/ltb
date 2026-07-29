import { ConfigService } from "@nestjs/config";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadEnvFile } from "node:process";
import { Readable } from "node:stream";
import type { CvStorageService } from "../src/modules/files/cv-storage.service";
import { CvOcrService } from "../src/modules/ai/cv-ocr.service";
import { CvTextExtractorService } from "../src/modules/ai/cv-text-extractor.service";
import { prepareCvMatchInputForAi } from "../src/modules/ai/cv-text-cleaner";
import { groundCriterionEvaluations } from "../src/modules/ai/match-analysis";
import { calculateMatchScore, extractMatchCriteria } from "../src/modules/ai/match-scoring";
import { GroqAiProvider } from "../src/modules/ai/groq-ai.provider";

type FixtureExpectation = {
  file: string;
  mimeType: string;
  email: string;
  phone: string;
  fullNameContains: string;
  minChars: number;
  expectCriteriaCoverage: number;
  expectParser: "pdf-parse" | "mammoth" | "word-extractor" | "tesseract-ocr";
  expectOcrTruncated?: boolean;
};

void main();

async function main() {
  const fixtureDir = join(process.cwd(), "test", "fixtures", "cv-eval");
  loadLocalEnv(join(process.cwd(), "..", "..", ".env.dev"));
  loadLocalEnv(join(process.cwd(), "..", "..", ".env.local"));

  const expectations = JSON.parse(
    readFileSync(join(fixtureDir, "expected.json"), "utf8"),
  ) as FixtureExpectation[];
  const missingFixtures = expectations.filter(({ file }) => !existsSync(join(fixtureDir, file)));
  if (missingFixtures.length > 0) {
    throw new Error(
      `Missing generated fixtures: ${missingFixtures.map(({ file }) => file).join(", ")}. Run pnpm --filter @hr-copilot/api eval:cv:fixtures.`,
    );
  }

  const config = new ConfigService({
    ...process.env,
    MAX_CV_FILE_SIZE_MB: Number(process.env.MAX_CV_FILE_SIZE_MB || 10),
    OCR_MAX_PAGES: Number(process.env.OCR_MAX_PAGES || 10),
    OCR_MIN_CONFIDENCE: Number(process.env.OCR_MIN_CONFIDENCE || 55),
    OCR_TIMEOUT_MS: Number(process.env.OCR_TIMEOUT_MS || 120_000),
  });
  const storage = {
    async openCandidateCv(path: string) {
      return { stream: Readable.from(await readFile(path)) };
    },
  } as unknown as CvStorageService;
  const ocr = new CvOcrService(config);
  const extractor = new CvTextExtractorService(config, storage, ocr);
  const aiEnabled = process.env.AI_PROVIDER === "groq";
  const provider = aiEnabled ? new GroqAiProvider(config) : undefined;
  const criteria = extractMatchCriteria([
    "Yêu cầu công việc:",
    "- Ít nhất 3 năm kinh nghiệm React và TypeScript.",
    "- Có kinh nghiệm xây dựng REST API.",
    "- Biết Jest hoặc kiểm thử tự động là một lợi thế.",
  ].join("\n"));
  const rows: Array<Record<string, string | number | boolean>> = [];
  let failed = false;

  try {
    for (const expected of expectations) {
      const startedAt = performance.now();
      try {
        const extracted = await extractor.extract({
          originalName: expected.file,
          mimeType: expected.mimeType,
          path: join(fixtureDir, expected.file),
        });
        const contactPass = includesNormalized(extracted.text, expected.email)
          && includesNormalized(extracted.text, expected.phone);
        const namePass = includesNormalized(extracted.text, expected.fullNameContains);
        let coverage: number | undefined;
        let score: number | undefined;

        if (provider) {
          const aiReadyCv = prepareCvMatchInputForAi(extracted.text, 45_000, criteria, [
            expected.fullNameContains,
          ]);
          const analysis = await provider.analyzeMatch({
            jobTitle: "Frontend Engineer",
            jobDescription: "Xây dựng sản phẩm tuyển dụng web có khả năng truy cập tốt.",
            criteria,
            cvText: aiReadyCv.text,
          });
          const evaluationMap = groundCriterionEvaluations(
            criteria,
            analysis.evaluations,
            aiReadyCv.text,
          );
          coverage = criteria.length === 0
            ? 0
            : criteria.filter((criterion) => evaluationMap.get(criterion.id)?.status !== "unknown").length / criteria.length;
          score = calculateMatchScore(criteria, evaluationMap);
        }

        const pass = extracted.parser === expected.expectParser
          && extracted.text.length >= expected.minChars
          && contactPass
          && namePass
          && (expected.expectOcrTruncated === undefined || extracted.ocrTruncated === expected.expectOcrTruncated)
          && (coverage === undefined || coverage >= expected.expectCriteriaCoverage);
        failed ||= !pass;
        rows.push({
          file: expected.file,
          pass,
          parser: extracted.parser,
          chars: extracted.text.length,
          ocrConfidence: extracted.ocrConfidence ?? "-",
          truncated: extracted.ocrTruncated ?? false,
          contact: contactPass,
          name: namePass,
          coverage: coverage === undefined ? "AI off" : coverage.toFixed(2),
          score: score ?? "-",
          elapsedMs: Math.round(performance.now() - startedAt),
        });
      } catch (error) {
        failed = true;
        rows.push({
          file: expected.file,
          pass: false,
          parser: "error",
          chars: 0,
          ocrConfidence: "-",
          truncated: false,
          contact: false,
          name: false,
          coverage: "-",
          score: "-",
          elapsedMs: Math.round(performance.now() - startedAt),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    await ocr.onModuleDestroy();
  }

  console.table(rows);
  console.log(`Evaluation: ${rows.filter((row) => row.pass).length}/${rows.length} fixtures passed${aiEnabled ? " with Groq" : " (extraction only; AI_PROVIDER is not groq)"}.`);
  if (failed) process.exitCode = 1;
}

function includesNormalized(text: string, expected: string) {
  const normalize = (value: string) => value.toLocaleLowerCase("vi").replace(/[\s()-]+/gu, "");
  return normalize(text).includes(normalize(expected));
}

function loadLocalEnv(path: string) {
  if (!existsSync(path)) return;
  loadEnvFile(path);
}
