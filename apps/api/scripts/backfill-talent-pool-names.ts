import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { loadEnvFile } from "node:process";
import { parseCvProfileFromText } from "../src/modules/ai/parse-cv-profile";

void main();

async function main() {
  loadLocalEnv(join(process.cwd(), "..", "..", ".env.dev"));
  loadLocalEnv(join(process.cwd(), "..", "..", ".env.local"));

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");

  const apply = process.argv.includes("--apply");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const rows: Array<Record<string, string>> = [];

  try {
    const entries = await prisma.talentPoolEntry.findMany({
      where: { extractedText: { not: null } },
      include: {
        candidate: true,
        file: { select: { originalName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    for (const entry of entries) {
      if (!entry.file || !entry.extractedText) continue;
      if (!shouldBackfillName(entry.candidate.fullName, entry.file.originalName)) continue;

      const parsedName = parseCvProfileFromText(entry.extractedText).fullName;
      if (!parsedName || parsedName === entry.candidate.fullName) continue;

      rows.push({
        entryId: entry.id,
        file: entry.file.originalName,
        from: entry.candidate.fullName,
        to: parsedName,
      });

      if (!apply) continue;

      const structuredData = mergeStructuredData(entry.structuredData, {
        fullName: parsedName,
        fullNameSource: "cv_text_backfill",
      });

      await prisma.$transaction([
        prisma.candidate.update({
          where: { id: entry.candidateId },
          data: { fullName: parsedName },
        }),
        prisma.talentPoolEntry.update({
          where: { id: entry.id },
          data: { structuredData },
        }),
      ]);
    }
  } finally {
    await prisma.$disconnect();
  }

  console.table(rows);
  console.log(`${apply ? "Updated" : "Would update"} ${rows.length} talent pool candidate name(s).`);
  if (!apply) console.log("Dry run only. Re-run with --apply to persist changes.");
}

function shouldBackfillName(candidateName: string, originalName: string) {
  const normalizedCandidate = normalizeForComparison(candidateName);
  const fileBase = normalizeForComparison(basename(originalName, extname(originalName)));

  return candidateName === "Ứng viên đang xử lý"
    || candidateName === "Ứng viên chưa rõ tên"
    || fileBase === normalizedCandidate
    || fileBase.startsWith(normalizedCandidate)
    || looksLikeInboundFileName(candidateName);
}

function looksLikeInboundFileName(value: string) {
  return /^\d{8,}[-_\s]*(?:inbound|cv|resume)?/iu.test(value.trim());
}

function normalizeForComparison(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("vi")
    .replace(/\.[a-z0-9]+$/iu, "")
    .replace(/[^a-z0-9\p{L}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function mergeStructuredData(value: Prisma.JsonValue | null, updates: Record<string, Prisma.InputJsonValue>) {
  const base = value && typeof value === "object" && !Array.isArray(value)
    ? value as Prisma.InputJsonObject
    : {};

  return {
    ...base,
    ...updates,
  } satisfies Prisma.InputJsonObject;
}

function loadLocalEnv(path: string) {
  if (!existsSync(path)) return;
  loadEnvFile(path);
}
