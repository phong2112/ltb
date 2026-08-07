import type {
  ApplicationStatus as ApiApplicationStatus,
  CvParseStatus as ApiCvParseStatus,
  CvSummary,
} from "@hr-copilot/shared";
import type { ApiJob } from "./jobs";

export type { CvSummary, ApiCvParseStatus };

export type ApiCandidateMessage = {
  id: string;
  applicationId: string;
  channel: string;
  direction: string;
  content: string;
  createdAt: string;
};

export type ApiApplication = {
  id: string;
  candidateId: string;
  jobId: string;
  submittedFullName: string;
  submittedEmail?: string | null;
  submittedPhone?: string | null;
  submittedLinkedinUrl?: string | null;
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
    status?: ApiCvParseStatus;
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
    linkedinUrl?: string | null;
    portfolioUrl?: string | null;
  };
};

export type ApiApplicationAnalysis = {
  applicationId: string;
  status: ApiCvParseStatus;
  summary?: string | null;
  errorMessage?: string | null;
  cvSummary?: CvSummary | null;
  confidence?: number | null;
  analysisSignals?: unknown;
  updatedAt?: string;
  matchResult?: ApiApplication["matchResult"];
};

export type ApiCandidateProfile = {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  applications?: ApiApplication[];
};
