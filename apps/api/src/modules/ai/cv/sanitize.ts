import { type Prisma } from "@prisma/client";
import type { CvSummary } from "../../../models/ai";

/** Sanitizes a raw AI-generated CV summary into a safe Prisma JSON object, redacting PII. */
export function sanitizeCvSummary(summary: CvSummary): Prisma.InputJsonObject {
  return {
    overview: sanitizeSummaryText(summary.overview),
    currentTitle: sanitizeNullableSummaryText(summary.currentTitle),
    totalExperience: sanitizeNullableSummaryText(summary.totalExperience),
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
  return values.map(sanitizeSummaryText).filter(Boolean).slice(0, maxItems);
}

function sanitizeWorkExperiences(values: NonNullable<CvSummary["workExperiences"]>, maxItems: number) {
  return values
    .map(item => ({
      company: sanitizeSummaryText(item.company),
      title: sanitizeNullableSummaryText(item.title),
      duration: sanitizeNullableSummaryText(item.duration),
    }))
    .filter(item => item.company)
    .slice(0, maxItems);
}

function sanitizeNullableSummaryText(value: string | null) {
  const sanitized = value ? sanitizeSummaryText(value) : "";
  return sanitized || null;
}

function sanitizeSummaryText(value: string) {
  return value
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/giu, "[email đã ẩn]")
    .replace(/https?:\/\/[^\s)"'<>]+/giu, "[url đã ẩn]")
    .replace(/\+?\d[\d\s.\-()]{7,}\d/gu, "")
    .replace(/\[số điện thoại đã ẩn\]/giu, "")
    .replace(/\s*[-–—,:;|\/]\s*$/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}
