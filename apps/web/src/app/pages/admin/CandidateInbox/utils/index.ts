import type { CandidateStatus } from "@/app/data";
import { stringField, stringList } from "@/app/utils/data";
import { SORT_NAME_ASC, SORT_NEWEST, SORT_OLDEST, STATUS_OPTS } from "@/app/pages/admin/CandidateInbox/constants";
import type { SortOrder, UnifiedCandidateRow } from "@/app/pages/admin/CandidateInbox/types";

export { stringField, stringList };

/** Reads the candidate status filter from the URL and falls back to "all" for invalid values. */
export function readUrlStatus(searchParams: URLSearchParams): CandidateStatus | "all" {
  const value = searchParams.get("status");
  if (value && (STATUS_OPTS as readonly string[]).includes(value)) {
    return value as CandidateStatus | "all";
  }
  return "all";
}

/** Reads the candidate sort order from the URL and falls back to newest-first. */
export function readUrlSort(searchParams: URLSearchParams): SortOrder {
  const value = searchParams.get("sort");
  if (value === SORT_NEWEST || value === SORT_OLDEST || value === SORT_NAME_ASC) return value;
  return SORT_NEWEST;
}

/** Reads the inbox page number from the URL and normalizes invalid values to page 1. */
export function readUrlPage(searchParams: URLSearchParams) {
  const value = Number(searchParams.get("page"));
  return Number.isInteger(value) && value > 0 ? value : 1;
}

/** Creates a stable-enough key for unsaved File objects while assigning target jobs. */
export function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

/** Groups selected CV files by the job they should be uploaded against. */
export function groupFilesByTargetJob(files: File[], fileTargetJobIds: Record<string, string>) {
  const groups = new Map<string, File[]>();

  for (const file of files) {
    const targetJobId = fileTargetJobIds[fileKey(file)] ?? "";
    groups.set(targetJobId, [...(groups.get(targetJobId) ?? []), file]);
  }

  return Array.from(groups, ([targetJobId, groupedFiles]) => ({
    targetJobId,
    files: groupedFiles,
  }));
}

/**
 * Formats candidate dates using the active UI language.
 * Produces a numeric format (e.g. "03/15/2024" / "15/03/2024").
 */
export function formatDate(value: string, language: "vi" | "en") {
  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

/** Converts date strings to sortable timestamps, pushing invalid dates to the oldest bucket. */
export function timestamp(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Applies the inbox sort order with deterministic name/date tie-breakers. */
export function compareRows(left: UnifiedCandidateRow, right: UnifiedCandidateRow, sortOrder: SortOrder, language: "vi" | "en") {
  if (sortOrder === SORT_NAME_ASC) {
    return left.name.localeCompare(right.name, language === "vi" ? "vi" : "en", { sensitivity: "base" })
      || right.sortTimestamp - left.sortTimestamp;
  }

  const byDate = sortOrder === SORT_OLDEST
    ? left.sortTimestamp - right.sortTimestamp
    : right.sortTimestamp - left.sortTimestamp;

  return byDate || left.name.localeCompare(right.name, language === "vi" ? "vi" : "en", { sensitivity: "base" });
}
