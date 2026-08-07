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

const cvMimeTypeByExtension: Record<(typeof allowedCvExtensions)[number], (typeof allowedCvMimeTypes)[number]> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

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

export function getCvMimeTypeForExtension(value: string) {
  const normalized = normalizeCvExtension(value);
  return isAllowedCvExtension(normalized)
    ? cvMimeTypeByExtension[normalized as (typeof allowedCvExtensions)[number]]
    : "application/octet-stream";
}

export const defaultMaxCvFileSizeMb = 10;
export const maxApplicationCvFiles = 1;
export const maxTalentPoolCvFiles = 20;
export const maxScreeningAnswerLength = 1000;

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
