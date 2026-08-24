export const allowedCvMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
] as const;

export const allowedCvExtensions = ["pdf", "doc", "docx", "jpg", "jpeg", "png"] as const;
export const allowedCvExtensionsWithDot = allowedCvExtensions.map((extension) => `.${extension}` as const);
export const cvAcceptAttribute = [...allowedCvExtensionsWithDot, ...allowedCvMimeTypes].join(",");

export function normalizeCvExtension(value: string) {
  return value.trim().toLowerCase().replace(/^\./u, "");
}

export function isAllowedCvExtension(value: string) {
  const normalized = normalizeCvExtension(value);
  return allowedCvExtensions.some((extension) => extension === normalized);
}

export function isAllowedCvMimeType(value: string) {
  return allowedCvMimeTypes.some((mimeType) => mimeType === value);
}

export const defaultMaxCvFileSizeMb = 10;
export const maxApplicationCvFiles = 1;
export const maxTalentPoolCvFiles = 20;
export const maxScreeningAnswerLength = 1000;

const WORK_DURATION_RANGE_SEPARATOR = /(?:\s[-–—]\s|\bto\b|\bđến\b|\bthrough\b|\buntil\b)/iu;
const COMPACT_YEAR_RANGE = /\b(?:19|20)\d{2}\s*[-–—]\s*(?:(?:19|20)\d{2}|present|current|now|nay|hiện tại)\b/iu;
const CURRENT_WORK_MARKER = /\b(?:present|current|now|nay|hiện tại)\b/iu;
const ROUGH_TENURE = /\b\d+(?:[.,]\d+)?\+?\s*(?:năm|tháng|years?|yrs?|months?)\b/iu;
const FOUR_DIGIT_YEAR = /\b(?:19|20)\d{2}\b/gu;

/** Keeps only complete work periods, preventing a lone date from being displayed as a date range. */
export function normalizeWorkExperienceDuration(value?: string | null) {
  const normalized = value?.replace(/\s+/gu, " ").trim() ?? "";
  if (!normalized) return null;
  if (ROUGH_TENURE.test(normalized)) return normalized;
  if (COMPACT_YEAR_RANGE.test(normalized)) return normalized;
  if (!WORK_DURATION_RANGE_SEPARATOR.test(normalized)) return null;

  const years = normalized.match(FOUR_DIGIT_YEAR)?.length ?? 0;
  return years >= 2 || (years >= 1 && CURRENT_WORK_MARKER.test(normalized)) ? normalized : null;
}

export type CvSummary = {
  overview: string;
  currentTitle: string | null;
  totalExperience: string | null;
  keySkills: string[];
  workExperiences?: {
    company: string;
    title: string | null;
    duration: string | null;
  }[];
  workCompanies: string[];
  workHighlights: string[];
  education: string[];
  languages: string[];
  notesForTa: string[];
};
