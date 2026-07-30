import { ConfigService } from "@nestjs/config";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { loadEnvFile } from "node:process";
import { Readable } from "node:stream";
import { CvOcrService } from "../src/modules/ai/cv-ocr.service";
import { CvTextExtractorService } from "../src/modules/ai/cv-text-extractor.service";
import { GroqAiProvider, QuotaExceededError } from "../src/modules/ai/groq-ai.provider";
import { parseCvProfileFromText } from "../src/modules/ai/parse-cv-profile";
import type { ExtractedProfile } from "../src/modules/ai/ai.types";
import type { CvStorageService } from "../src/modules/files/cv-storage.service";

const UPLOAD_CV_DIR = join(process.cwd(), "..", "..", "uploads", "cv");

void main();

async function main() {
  loadLocalEnv(join(process.cwd(), "..", "..", ".env.dev"));
  loadLocalEnv(join(process.cwd(), "..", "..", ".env.local"));

  const files = filterFiles(await listCvFiles(UPLOAD_CV_DIR));
  if (files.length === 0) throw new Error(`No CV files found under ${UPLOAD_CV_DIR}`);

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
  const aiProvider = shouldRunAi() ? new GroqAiProvider(config) : undefined;

  try {
    for (const file of files.slice(0, positiveIntegerFromEnv("EVAL_FILE_LIMIT") ?? files.length)) {
      const extracted = await extractor.extract({
        originalName: file.split("/").at(-1) ?? "uploaded-cv",
        mimeType: mimeTypeForFile(file),
        path: file,
      });
      const localProfile = parseCvProfileFromText(extracted.text);
      let aiProfile: ExtractedProfile | undefined;

      if (aiProvider) {
        await delayBetweenRequests();
        try {
          aiProfile = await extractProfileWithRetry(aiProvider, {
            fileName: file.split("/").at(-1) ?? "uploaded-cv",
            cvText: extracted.text,
          });
        } catch (error) {
          console.log(`\nAI skipped for ${relative(join(process.cwd(), "..", ".."), file)}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      printProfileComparison(file, extracted, localProfile, aiProfile);
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

function printProfileComparison(
  file: string,
  extracted: { parser: string; text: string; qualityScore?: number },
  localProfile: ReturnType<typeof parseCvProfileFromText>,
  aiProfile?: ExtractedProfile,
) {
  console.log(`\nCV: ${relative(join(process.cwd(), "..", ".."), file)}`);
  console.log(`Extraction: parser=${extracted.parser} chars=${extracted.text.length} quality=${extracted.qualityScore ?? "n/a"}`);
  console.log(`Local name: ${localProfile.fullName ?? "—"}`);
  console.log(`Local title: ${localProfile.title ?? "—"}`);
  console.log(`Local skills (${localProfile.skills?.length ?? 0}): ${formatList(localProfile.skills)}`);

  if (!aiProfile) return;
  console.log(`AI name: ${aiProfile.fullName ?? "—"}`);
  console.log(`AI title: ${aiProfile.title ?? "—"}`);
  console.log(`AI years: ${aiProfile.yearsExperience ?? "—"}`);
  console.log(`AI skills (${aiProfile.skills.length}): ${formatList(aiProfile.skills)}`);
  console.log(`Skill overlap: ${skillOverlap(localProfile.skills ?? [], aiProfile.skills)}`);
}

function skillOverlap(localSkills: string[], aiSkills: string[]) {
  if (!localSkills.length || !aiSkills.length) return "0%";
  const normalizedAi = new Set(aiSkills.map(normalizeSkill));
  const overlap = localSkills.filter((skill) => normalizedAi.has(normalizeSkill(skill))).length;
  return `${Math.round((overlap / localSkills.length) * 100)}% (${overlap}/${localSkills.length})`;
}

function normalizeSkill(value: string) {
  return value.toLocaleLowerCase("en").replace(/[^a-z0-9+#.]+/gu, "");
}

function formatList(values?: string[]) {
  return values?.length ? values.join(", ") : "—";
}

function isSupportedCvFile(path: string) {
  return [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"].includes(extname(path).toLowerCase());
}

function filterFiles(files: string[]) {
  const fileMatch = process.env.EVAL_FILE_MATCH;
  return fileMatch ? files.filter((file) => file.includes(fileMatch)) : files;
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

function shouldRunAi() {
  if (process.env.EVAL_PROFILE_AI !== "true") return false;
  if (process.env.AI_PROVIDER !== "groq") {
    throw new Error("Set AI_PROVIDER=groq to evaluate profile output with Groq.");
  }
  if (process.env.EVAL_ALLOW_EXTERNAL_AI !== "true") {
    throw new Error(
      "This script sends local CV contents to the configured AI provider. Set EVAL_ALLOW_EXTERNAL_AI=true after confirming the data may be shared with that provider.",
    );
  }
  return true;
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

async function extractProfileWithRetry(provider: GroqAiProvider, input: Parameters<GroqAiProvider["extractProfile"]>[0]) {
  const maxRetries = positiveIntegerFromEnv("EVAL_MAX_QUOTA_RETRIES") ?? 0;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await provider.extractProfile(input);
    } catch (error) {
      if (!(error instanceof QuotaExceededError) || attempt === maxRetries) throw error;
      const waitMs = Math.min(Math.max(error.retryAfterMs, 60_000), 180_000);
      console.log(`Rate limited by AI provider; waiting ${Math.round(waitMs / 1000)}s before retry ${attempt + 1}/${maxRetries}.`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw new Error("AI provider did not return a profile.");
}

function loadLocalEnv(path: string) {
  if (!existsSync(path)) return;
  loadEnvFile(path);
}
