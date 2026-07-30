import { ConfigService } from "@nestjs/config";
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { loadEnvFile } from "node:process";
import { Readable } from "node:stream";
import type { CvStorageService } from "../src/modules/files/cv-storage.service";
import { CvOcrService } from "../src/modules/ai/cv-ocr.service";
import { CvTextExtractorService } from "../src/modules/ai/cv-text-extractor.service";
import { prepareCvMatchInputForAi } from "../src/modules/ai/cv-text-cleaner";
import { groundCriterionEvaluations } from "../src/modules/ai/match-analysis";
import {
  calculateConfidence,
  calculateMatchScore,
  calculatePotentialMatchScore,
  extractMatchCriteria,
} from "../src/modules/ai/match-scoring";
import { GroqAiProvider } from "../src/modules/ai/groq-ai.provider";
import { QuotaExceededError } from "../src/modules/ai/groq-ai.provider";

const UPLOAD_CV_DIR = join(process.cwd(), "..", "..", "uploads", "cv");
const MAX_AI_CV_CHARACTERS = 45_000;
const DEFAULT_MAX_QUOTA_RETRIES = 3;

const JOB_CASES = [
  {
    title: "Frontend Engineer (React)",
    description: "Xây dựng ứng dụng web React/Next.js cho sản phẩm có nhiều người dùng.",
    requirements: [
      "- 3+ năm kinh nghiệm React",
      "- Thành thạo TypeScript và Next.js",
      "- Có mắt thẩm mỹ và chú trọng chi tiết",
      "- Tiếng Anh giao tiếp được",
      "- Kinh nghiệm với TailwindCSS là lợi thế",
    ].join("\n"),
  },
  {
    title: "Backend Engineer (Node.js)",
    description: "Thiết kế API, tối ưu PostgreSQL và phát triển dịch vụ backend có độ tin cậy cao.",
    requirements: [
      "- 4+ năm kinh nghiệm backend Node.js",
      "- Có kinh nghiệm NestJS hoặc framework tương đương",
      "- Hiểu transaction, locking và indexing trong PostgreSQL",
      "- Ưu tiên từng làm sản phẩm fintech hoặc payment",
    ].join("\n"),
  },
  {
    title: "Mobile Engineer (iOS)",
    description: "Phát triển ứng dụng iOS native, tối ưu hiệu năng và phối hợp release app lên App Store.",
    requirements: [
      "- Minimum 5 years of hands-on experience in native iOS application development.",
      "- Strong proficiency in Swift and SwiftUI.",
      "- Experience releasing apps to the App Store.",
      "- Understanding of mobile architecture, performance, and debugging.",
      "- React Native experience is a plus.",
    ].join("\n"),
  },
  {
    title: "QA Automation Engineer",
    description: "Xây dựng test suite tự động cho nền tảng SaaS B2B, kiểm thử API/UI và theo dõi chất lượng release.",
    requirements: [
      "- 2+ năm kinh nghiệm QA automation",
      "- Thành thạo Playwright, Cypress hoặc Selenium",
      "- Biết test API và đọc log backend",
      "- Có tư duy phân tích lỗi rõ ràng",
      "- Kinh nghiệm performance testing là lợi thế",
    ].join("\n"),
  },
  {
    title: "Senior Product Designer",
    description: "Dan dat product design, interaction design va design system cho san pham web.",
    requirements: [
      "- Toi thieu 5 nam kinh nghiem Product Design",
      "- Portfolio the hien qua trinh thiet ke end-to-end",
      "- Thanh thao Figma va cac cong cu prototyping",
      "- Ky nang giao tiep va lam viec nhom xuat sac",
      "- Kinh nghiem xay dung Design System la loi the",
    ].join("\n"),
  },
  {
    title: "TA Business Partner",
    description: "Ho tro phat trien doi ngu, tuyen dung va van hoa to chuc trong moi truong startup.",
    requirements: [
      "- 4+ nam kinh nghiem TA",
      "- Nen tang TABP hoac TA Generalist",
      "- Ky nang lang nghe va coaching xuat sac",
      "- Am hieu Luat Lao dong Viet Nam",
      "- Kinh nghiem trong moi truong startup la loi the",
    ].join("\n"),
  },
];

void main();

async function main() {
  loadLocalEnv(join(process.cwd(), "..", "..", ".env.dev"));
  loadLocalEnv(join(process.cwd(), "..", "..", ".env.local"));

  if (process.env.AI_PROVIDER !== "groq") {
    throw new Error("Set AI_PROVIDER=groq to evaluate prompt and model output.");
  }
  if (process.env.EVAL_ALLOW_EXTERNAL_AI !== "true") {
    throw new Error(
      "This script sends local CV contents to the configured AI provider. Set EVAL_ALLOW_EXTERNAL_AI=true after confirming the data may be shared with that provider.",
    );
  }

  const files = filterFiles(await listCvFiles(UPLOAD_CV_DIR));
  if (files.length === 0) throw new Error(`No CV files found under ${UPLOAD_CV_DIR}`);
  const jobCases = filterJobs(JOB_CASES).slice(0, positiveIntegerFromEnv("EVAL_JOB_LIMIT") ?? JOB_CASES.length);

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
  const provider = new GroqAiProvider(config);

  try {
    for (const file of files) {
      const extracted = await extractor.extract({
        originalName: file.split("/").at(-1) ?? "uploaded-cv",
        mimeType: mimeTypeForFile(file),
        path: file,
      });

      console.log(`\nCV: ${relative(join(process.cwd(), "..", ".."), file)}`);
      console.log(`Extraction: parser=${extracted.parser} chars=${extracted.text.length} quality=${extracted.qualityScore}`);

      for (const job of jobCases) {
        await delayBetweenRequests();
        const criteria = extractMatchCriteria(job.requirements);
        const aiReadyCv = prepareCvMatchInputForAi(extracted.text, MAX_AI_CV_CHARACTERS, criteria);
        try {
          const analysis = await analyzeMatchWithRetry(provider, {
            jobTitle: job.title,
            jobDescription: job.description,
            criteria,
            cvText: aiReadyCv.text,
          });
          const evaluations = groundCriterionEvaluations(criteria, analysis.evaluations, aiReadyCv.text);
          const score = calculateMatchScore(criteria, evaluations);
          const potentialScore = calculatePotentialMatchScore(criteria, evaluations);
          const confidence = calculateConfidence(criteria, evaluations);

          console.log(`\nJob: ${job.title}`);
          console.log(`Score: ${score} | potential=${potentialScore} | evidenceCoverage=${confidence} | aiInput=${aiReadyCv.selectedCharacters}/${aiReadyCv.sourceCharacters} chars`);
          for (const criterion of criteria) {
            const evaluation = evaluations.get(criterion.id);
            console.log([
              `- ${criterion.id}`,
              `[${criterion.importance}/${criterion.constraintType}]`,
              evaluation?.status ?? "unknown",
              `evidence=${evaluation?.evidence.length ?? 0}`,
              `reason=${singleLine(evaluation?.reason ?? "")}`,
            ].join(" "));
          }
        } catch (error) {
          console.log(`\nJob: ${job.title}`);
          console.log(`Skipped: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  } finally {
    await ocr.onModuleDestroy();
  }
}

async function listCvFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listCvFiles(path);
    return isSupportedCvFile(path) ? [path] : [];
  }));
  return nested.flat().sort();
}

function isSupportedCvFile(path: string) {
  return [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"].includes(extname(path).toLowerCase());
}

function filterFiles(files: string[]) {
  const fileMatch = process.env.EVAL_FILE_MATCH;
  return fileMatch ? files.filter((file) => file.includes(fileMatch)) : files;
}

function filterJobs<T extends { title: string }>(jobs: T[]) {
  const jobMatch = process.env.EVAL_JOB_MATCH;
  return jobMatch
    ? jobs.filter((job) => job.title.toLocaleLowerCase("vi").includes(jobMatch.toLocaleLowerCase("vi")))
    : jobs;
}

function mimeTypeForFile(path: string) {
  const extension = extname(path).toLowerCase();
  if (extension === ".pdf") return "application/pdf";
  if (extension === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (extension === ".doc") return "application/msword";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

function singleLine(value: string) {
  return value.replace(/\s+/gu, " ").trim().slice(0, 220);
}

function loadLocalEnv(path: string) {
  if (!existsSync(path)) return;
  loadEnvFile(path);
}

function positiveIntegerFromEnv(name: string) {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

async function delayBetweenRequests() {
  const delayMs = positiveIntegerFromEnv("EVAL_REQUEST_DELAY_MS") ?? 0;
  if (delayMs <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function analyzeMatchWithRetry(
  provider: GroqAiProvider,
  input: Parameters<GroqAiProvider["analyzeMatch"]>[0],
) {
  const maxRetries = positiveIntegerFromEnv("EVAL_MAX_QUOTA_RETRIES") ?? DEFAULT_MAX_QUOTA_RETRIES;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await provider.analyzeMatch(input);
    } catch (error) {
      if (!(error instanceof QuotaExceededError) || attempt === maxRetries) throw error;
      const waitMs = Math.min(Math.max(error.retryAfterMs, 60_000), 180_000);
      console.log(`Rate limited by AI provider; waiting ${Math.round(waitMs / 1000)}s before retry ${attempt + 1}/${maxRetries}.`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw new Error("AI provider did not return a match analysis.");
}
