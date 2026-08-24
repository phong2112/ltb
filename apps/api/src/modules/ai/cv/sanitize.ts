import { type Prisma } from "@prisma/client";
import { normalizeWorkExperienceDuration } from "@hr-copilot/shared";
import type { CvSummary } from "@/models/ai";

const PHONE_LIKE_PATTERN = /(?:\+?\d[\d\s.\-()]{7,}\d)/gu;

/** Sanitizes a raw AI-generated CV summary into a safe Prisma JSON object, redacting PII. */
export function sanitizeCvSummary(summary: CvSummary): Prisma.InputJsonObject {
  return {
    overview: sanitizeSummaryText(summary.overview),
    currentTitle: sanitizeNullableSummaryText(summary.currentTitle),
    totalExperience: sanitizeTotalExperience(summary.totalExperience),
    keySkills: sanitizeSummaryList(summary.keySkills, 12),
    workExperiences: sanitizeWorkExperiences(summary.workExperiences ?? [], 8),
    workCompanies: sanitizeSummaryList(summary.workCompanies, 8),
    workHighlights: sanitizeSummaryList(summary.workHighlights, 6),
    education: sanitizeSummaryList(summary.education, 4),
    languages: sanitizeSummaryList(summary.languages, 6),
    notesForTa: sanitizeSummaryList(summary.notesForTa, 5),
  };
}

function sanitizeSummaryList(values: string[], maxItems: number) {
  const seen = new Set<string>();

  return values
    .map(sanitizeSummaryText)
    .filter(isCompleteCvSummaryText)
    .filter(value => {
      const key = value.toLocaleLowerCase("vi");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maxItems);
}

function sanitizeWorkExperiences(values: NonNullable<CvSummary["workExperiences"]>, maxItems: number) {
  return values
    .map(item => ({
      company: sanitizeSummaryText(item.company),
      title: sanitizeNullableSummaryText(item.title),
      duration: sanitizeWorkDuration(item.duration),
    }))
    .filter(item => isCompleteCvSummaryText(item.company))
    .slice(0, maxItems);
}

function sanitizeNullableSummaryText(value: string | null) {
  const sanitized = value ? sanitizeSummaryText(value) : "";
  return isCompleteCvSummaryText(sanitized) ? sanitized : null;
}

function sanitizeTotalExperience(value: string | null) {
  const sanitized = sanitizeNullableSummaryText(value);
  if (!sanitized) return null;

  return /\b(?:năm|tháng|years?|yrs?|months?)\b/iu.test(sanitized) ? sanitized : null;
}

function sanitizeWorkDuration(value: string | null) {
  const sanitized = value ? sanitizeSummaryText(value) : "";
  return normalizeWorkExperienceDuration(sanitized);
}

function sanitizeSummaryText(value: string) {
  return value
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/giu, "[email đã ẩn]")
    .replace(/https?:\/\/[^\s)"'<>]+/giu, "[url đã ẩn]")
    .replace(PHONE_LIKE_PATTERN, match => {
      const digitCount = match.replace(/\D/gu, "").length;
      return digitCount >= 9 && digitCount <= 15 ? "" : match;
    })
    .replace(/\[số điện thoại đã ẩn\]/giu, "")
    .replace(/\s*[-–—,:;|\/]\s*$/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

/** Rejects isolated or visibly truncated OCR/AI fragments. */
function isCompleteCvSummaryText(value: string) {
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (normalized.length < 2) return false;

  // Examples rejected here: "J", "Frontend D", "React Hook F", "Hà N".
  return !/(?:^|\s)\p{Lu}$/u.test(normalized);
}
