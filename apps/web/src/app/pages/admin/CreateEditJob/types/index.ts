import type { Job } from "@/app/data";

export type JobForm = Omit<Job, "id" | "posted" | "applicants" | "location">;
export type SalaryCurrency = "VND" | "USD";
export type SavingAction = "publish" | "save";
export type JobFormField =
  | "title"
  | "company"
  | "locations"
  | "salary"
  | "type"
  | "level"
  | "tags"
  | "description"
  | "requirements"
  | "benefits"
  | "questions";
export type FormErrors = Partial<Record<JobFormField, string>>;
