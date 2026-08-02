import type { JobStatus as ApiJobStatus } from "@hr-copilot/shared";
import type { JobStatus } from "@/app/utils/configs/status-config";

export type { JobStatus } from "@/app/utils/configs/status-config";

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

export type ApiJob = {
  id: string;
  title: string;
  company?: string | null;
  department?: string | null;
  locations?: string[] | null;
  location?: string | null;
  employment?: string | null;
  level?: string | null;
  salaryRange?: string | null;
  tags?: string[] | null;
  description: string;
  requirements: string;
  benefits?: string | null;
  status: ApiJobStatus;
  urgent?: boolean | null;
  logo?: string | null;
  questions?:
    | {
        id: string;
        label?: string | null;
        required?: boolean | null;
        sortOrder?: number | null;
      }[]
    | null;
  createdAt?: string;
  _count?: {
    applications?: number;
  };
};

