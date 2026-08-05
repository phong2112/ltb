import type { CandidateStatus } from "@/app/data";
import { SORT_NAME_ASC, SORT_NEWEST, SORT_OLDEST, STATUS_OPTS } from "../constants";
import type { SortOrder, UnifiedCandidateRow } from "../types";

export function readUrlStatus(searchParams: URLSearchParams): CandidateStatus | "all" {
  const value = searchParams.get("status");
  if (value && (STATUS_OPTS as readonly string[]).includes(value)) {
    return value as CandidateStatus | "all";
  }
  return "all";
}

export function readUrlSort(searchParams: URLSearchParams): SortOrder {
  const value = searchParams.get("sort");
  if (value === SORT_NEWEST || value === SORT_OLDEST || value === SORT_NAME_ASC) return value;
  return SORT_NEWEST;
}

export function readUrlPage(searchParams: URLSearchParams) {
  const value = Number(searchParams.get("page"));
  return Number.isInteger(value) && value > 0 ? value : 1;
}

export function stringField(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

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

export function formatDate(value: string, language: "vi" | "en") {
  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function timestamp(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

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
