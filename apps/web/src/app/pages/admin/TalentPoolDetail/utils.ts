import type { CvSummary } from "@/app/data";
import type { ApiTalentPoolEntry } from "@/app/apis/models";
import { stringField, stringList } from "@/app/utils/data";
import type { ProfileForm } from "./types";


/**
 * Derives the initial editable form state from a talent pool entry.
 * Prefers structured-data values (AI-extracted) over candidate record values where available.
 */
export function formFromEntry(entry: ApiTalentPoolEntry): ProfileForm {
  const data = entry.structuredData ?? {};
  return {
    fullName: entry.candidate.fullName,
    email: stringField(data.email) || entry.candidate.email || "",
    phone: stringField(data.phone) || entry.candidate.phone || "",
    title: stringField(data.title),
    skills: stringList(data.skills).join(", "),
    notes: entry.notes ?? "",
  };
}

/**
 * Splits a comma-separated string into a de-duplicated array of trimmed, non-empty values.
 * Used when converting the skills text-field back to a string array for the API.
 */
export function splitValues(value: string): string[] {
  return [...new Set(value.split(",").map(item => item.trim()).filter(Boolean))];
}

/**
 * Reads a `CvSummary` object from an unknown structured-data field value.
 * Returns `null` when the value is missing, not an object, or lacks a non-empty `overview`.
 */
export function readCvSummary(value: unknown): CvSummary | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const overview = stringField(record.overview).trim();
  if (!overview) return null;
  return {
    overview,
    currentTitle: stringField(record.currentTitle) || null,
    totalExperience: stringField(record.totalExperience) || null,
    keySkills: stringList(record.keySkills),
    workExperiences: workExperienceList(record.workExperiences),
    workCompanies: stringList(record.workCompanies),
    workHighlights: stringList(record.workHighlights),
    education: stringList(record.education),
    languages: stringList(record.languages),
    notesForTa: stringList(record.notesForTa),
  };
}

/**
 * Normalises the `workExperiences` JSON array into typed objects, discarding malformed entries.
 * Any item without a non-empty `company` string is silently dropped.
 */
export function workExperienceList(value: unknown): Array<{ company: string; title: string | null; duration: string | null }> {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      const record = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : null;
      const company = stringField(record?.company).trim();
      if (!company) return null;
      return {
        company,
        title: stringField(record?.title).trim() || null,
        duration: stringField(record?.duration).trim() || null,
      };
    })
    .filter((item): item is { company: string; title: string | null; duration: string | null } => Boolean(item));
}

/**
 * Validates and returns an HTTP URL string from an unknown structured-data field.
 * Returns an empty string for non-string values or strings that are not HTTP(S) URLs.
 */
export function linkField(value: unknown): string {
  return typeof value === "string" && /^https?:\/\//i.test(value) ? value : "";
}


/**
 * Formats a date string for display using the active UI language.
 * Produces a medium-length format (e.g. "May 15, 2024" / "15 thg 5, 2024").
 */
export function formatDate(value: string, language: "vi" | "en"): string {
  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-US", { dateStyle: "medium" }).format(new Date(value));
}
