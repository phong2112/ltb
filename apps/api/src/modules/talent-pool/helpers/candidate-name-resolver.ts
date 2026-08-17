import { shouldPreferExtractedName } from "@hr-copilot/shared";
import { type Prisma } from "@prisma/client";
import { parseCvProfileFromText } from "../../ai/profile-parser";
import { extractText } from "./structured-data.helpers";

/**
 * Returns the candidate with its `fullName` replaced by the AI-extracted name when the stored
 * name is still a placeholder or a raw upload filename. Falls back to the stored name if no
 * extracted name is available or the stored name looks intentional.
 */
export function resolveCandidate<T extends { fullName: string }>(
  candidate: T,
  structuredData: Prisma.JsonValue | null,
  originalName?: string | null,
  extractedText?: string | null,
): T {
  const extractedFullName =
    extractText(structuredData, "fullName") ?? extractNameFromText(extractedText);

  if (!extractedFullName || !shouldPreferExtractedName(candidate.fullName, originalName)) {
    return candidate;
  }

  return { ...candidate, fullName: extractedFullName };
}

/** Parses the raw CV text for a full name using the CV profile parser. */
function extractNameFromText(extractedText?: string | null): string | undefined {
  if (!extractedText?.trim()) return undefined;
  return parseCvProfileFromText(extractedText).fullName;
}
