export const SAVED_JOBS_STORAGE_KEY = "hr_copilot_saved_job_ids";

export function readSavedJobIds() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(SAVED_JOBS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

