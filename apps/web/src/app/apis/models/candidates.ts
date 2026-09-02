import type {
  ApplicationStatus as ApiApplicationStatus,
  CvParseStatus as ApiCvParseStatus,
  CvSummary,
} from "@hr-copilot/shared";
import type { ApiJob } from "./jobs";

export type { CvSummary, ApiCvParseStatus };

/** API application record with submitted candidate data, CV parsing, and matching. */
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
  candidate?: {
    id: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    linkedinUrl?: string | null;
    portfolioUrl?: string | null;
  };
};

/** API response returned when reading or retrying AI analysis for one application. */
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

/** API candidate profile aggregate with all applications for that person. */
export type ApiCandidateProfile = {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  applications?: ApiApplication[];
};
