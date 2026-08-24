import { type Prisma } from "@prisma/client";
import { parseCvProfileFromText } from "@/modules/ai/profile-parser";

/**
 * Merges a patch object into an existing Prisma JSON value, producing an InputJsonObject.
 * Patch fields overwrite existing keys; non-object current values are treated as empty.
 */
export function mergeStructuredData(
  current: Prisma.JsonValue | null,
  patch: Record<string, unknown>,
): Prisma.InputJsonObject {
  const base =
    current && typeof current === "object" && !Array.isArray(current)
      ? (current as Record<string, unknown>)
      : {};
  return { ...base, ...patch } as Prisma.InputJsonObject;
}

/**
 * Fills in missing fields (fullName, title, skills) from CV text when structuredData
 * doesn't already contain them, tagging each filled field with a *Source marker.
 */
export function resolveStructuredData(
  structuredData: Prisma.JsonValue | null,
  extractedText?: string | null,
): Prisma.JsonObject | null {
  const parsed = extractedText?.trim() ? parseCvProfileFromText(extractedText) : undefined;
  const current: Prisma.JsonObject = (
    structuredData && typeof structuredData === "object" && !Array.isArray(structuredData)
      ? { ...(structuredData as Prisma.JsonObject) }
      : {}
  );

  if (!extractText(current, "fullName") && parsed?.fullName) {
    current.fullName = parsed.fullName;
    current.fullNameSource = "cv_text";
  }
  if (!extractText(current, "title") && parsed?.title) {
    current.title = parsed.title;
    current.titleSource = "cv_text";
  }
  if (!extractStringList(current, "skills").length && parsed?.skills?.length) {
    current.skills = parsed.skills;
    current.skillsSource = "cv_text";
  }

  return Object.keys(current).length ? current : null;
}

/**
 * Reads a string value from a Prisma JSON object by key.
 * Returns `undefined` when the value is missing, not a string, or shorter than 2 characters after trimming.
 */
export function extractText(structuredData: Prisma.JsonValue | null, key: string): string | undefined {
  if (!structuredData || typeof structuredData !== "object" || Array.isArray(structuredData)) return undefined;
  const value = (structuredData as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length >= 2 ? value.trim() : undefined;
}

/**
 * Reads a string array from a Prisma JSON object by key.
 * Returns only string elements; non-string array elements and non-array values produce an empty array.
 */
export function extractStringList(structuredData: Prisma.JsonValue | null, key: string): string[] {
  if (!structuredData || typeof structuredData !== "object" || Array.isArray(structuredData)) return [];
  const value = (structuredData as Record<string, unknown>)[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && !!item.trim())
    : [];
}
