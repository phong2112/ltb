import type { ApplicationStatus as ApiApplicationStatus, CvParseStatus as ApiCvParseStatus, CvSummary } from "@hr-copilot/shared";
import type { CandidateStatus } from "@/app/utils/configs/status-config";
import type { ApiJob } from "../jobs/types";

export type { CandidateStatus } from "@/app/utils/configs/status-config";
export type { CvSummary, ApiCvParseStatus };

export type CandidateMessageChannel = "system" | "messenger" | "zalo" | "email" | "linkedin";
type CandidateMessageDirection = "inbound" | "outbound";
export type AiAnalysisStatus = "pending" | "completed" | "failed";
export type AiReviewTone = "good" | "fair" | "check";

export type CandidateMessage = {
  id: string;
  applicationId: string;
  channel: CandidateMessageChannel;
  direction: CandidateMessageDirection;
  content: string;
  createdAt: string;
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
  aiReview: {
    label: string;
    note: string;
    tone: AiReviewTone;
    signals: string[];
  };
  aiError: string;
  aiSummary: string;
  cvSummary: CvSummary | null;
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

