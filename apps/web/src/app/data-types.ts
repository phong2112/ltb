import { createContext } from "react";
import type { ApplicationStatus as ApiApplicationStatus } from "@hr-copilot/shared";
import type { CandidateStatus, JobStatus } from "@/app/status-config";

export type { CandidateStatus, JobStatus } from "@/app/status-config";
export type CandidateMessageChannel = "system" | "messenger" | "zalo" | "email" | "linkedin";
type CandidateMessageDirection = "inbound" | "outbound";
export type AiAnalysisStatus = "pending" | "completed" | "failed";

export type CandidateMessage = {
  id: string;
  applicationId: string;
  channel: CandidateMessageChannel;
  direction: CandidateMessageDirection;
  content: string;
  createdAt: string;
};

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

export type Candidate = {
  id: string;
  applicationId: string;
  candidateId: string;
  name: string;
  email: string;
  phone: string;
  applicationArea: string;
  cvUrl: string;
  cvFile?: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  };
  coverNote: string;
  hrNote: string;
  jobId: string;
  jobTitle: string;
  status: CandidateStatus;
  appliedAt: string;
  followUpDate: string;
  aiScore: number;
  aiStatus: AiAnalysisStatus;
  aiConfidence: number | null;
  aiError: string;
  aiSummary: string;
  strengths: string[];
  risks: string[];
  missingReqs: string[];
  screeningAnswers: { q: string; a: string; required?: boolean }[];
  messages: CandidateMessage[];
};

export type CandidateProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  applications: Candidate[];
};

export type NewCandidate = {
  name: string;
  email: string;
  phone: string;
  applicationArea: string;
  cvUrl: string;
  note: string;
  jobId: string;
  jobTitle: string;
  status: CandidateStatus;
  cvFile?: File | null;
  questionAnswers?: {
    questionId: string;
    answer: string;
  }[];
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
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
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

export type ApiApplication = {
  id: string;
  candidateId: string;
  jobId: string;
  submittedFullName: string;
  submittedEmail?: string | null;
  submittedPhone?: string | null;
  submittedPortfolioUrl?: string | null;
  coverNote?: string | null;
  hrNotes?: string | null;
  status: ApiApplicationStatus;
  answers?: unknown;
  followUpTask?: {
    dueAt?: string | null;
  } | null;
  createdAt?: string;
  job?: ApiJob;
  matchResult?: {
    score?: number;
    strengths?: unknown;
    risks?: unknown;
    missingRequirements?: unknown;
    screeningQuestions?: unknown;
  } | null;
  cvParseResult?: {
    status?: "PENDING" | "COMPLETED" | "FAILED";
    summary?: string | null;
    errorMessage?: string | null;
    structuredData?: unknown;
  } | null;
  files?: {
    id: string;
    originalName?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
    path: string;
  }[];
  messages?: ApiCandidateMessage[];
  candidate?: {
    id: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    portfolioUrl?: string | null;
  };
};

export type ApiCandidateProfile = {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  applications?: ApiApplication[];
};

export type ApiCandidateMessage = {
  id: string;
  applicationId: string;
  channel: string;
  direction: string;
  content: string;
  createdAt: string;
};

export type ApiAuthSession = {
  user?: {
    email: string;
    name: string;
  };
};

export type LoginResult = { ok: true } | { ok: false; reason: "invalidCredentials" | "apiUnavailable" };

export type DataCtx = {
  jobs: Job[];
  candidateProfiles: CandidateProfile[];
  /** Application-level records used by pipeline, follow-up, and chat views. */
  candidates: Candidate[];
  isAdminLoggedIn: boolean;
  isAuthReady: boolean;
  isLoading: boolean;
  error: string;
  savedJobIds: string[];
  reloadPublicJobs: () => Promise<void>;
  reloadAdminData: () => Promise<void>;
  addJob: (j: JobInput) => Promise<void>;
  updateJob: (id: string, patch: Partial<Job>) => Promise<void>;
  addCandidate: (c: NewCandidate) => Promise<void>;
  updateCandidate: (id: string, patch: Partial<Candidate>) => Promise<void>;
  sendCandidateMessage: (applicationId: string, channel: CandidateMessageChannel, content: string) => Promise<void>;
  isJobSaved: (id: string) => boolean;
  toggleSavedJob: (id: string) => boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
};

export const DataContext = createContext<DataCtx>(null!);
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
