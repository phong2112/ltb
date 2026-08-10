import type { JobStatus as ApiJobStatus } from "@hr-copilot/shared";

/** API question configured on a job application form. */
export type ApiJobQuestion = {
  id: string;
  label?: string | null;
  required?: boolean | null;
  sortOrder?: number | null;
};

/** API job record used by public jobs and admin job management screens. */
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
  questions?: ApiJobQuestion[] | null;
  createdAt?: string;
  _count?: {
    applications?: number;
  };
};
