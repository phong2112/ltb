import type { JobStatus } from "@/app/utils/configs/status-config";
import type { ApiJob } from "@/app/apis/models";

export type { JobStatus } from "@/app/utils/configs/status-config";
export type { ApiJob };

export type JobQuestion = {
  id: string;
  label: string;
  required: boolean;
  sortOrder: number;
};

export type Job = {
  id: string;
  title: string;
  company: string;
  locations: string[];
  location: string;
  type: string;
  level: string;
  salary: string;
  tags: string[];
  description: string;
  requirements: string;
  benefits: string;
  status: JobStatus;
  posted: string;
  applicants: number;
  urgent: boolean;
  logo: string;
  questions: JobQuestion[];
};

export type JobInput = Omit<Job, "id" | "posted" | "applicants" | "location">;
