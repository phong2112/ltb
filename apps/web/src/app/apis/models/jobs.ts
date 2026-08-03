import type { JobStatus as ApiJobStatus } from "@hr-copilot/shared";

export type ApiJobQuestion = {
  id: string;
  label?: string | null;
  required?: boolean | null;
  sortOrder?: number | null;
};

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

