import type { CvSummary } from "@hr-copilot/shared";
import type {
  ApiApplication,
  ApiApplicationAnalysis,
  ApiCandidateMessage,
  ApiCandidateProfile,
  ApiCvParseStatus,
} from "@/app/apis/models";
import type { CandidateStatus } from "@/app/utils/configs/status-config";

export type { CandidateStatus } from "@/app/utils/configs/status-config";
export type {
  ApiApplication,
  ApiApplicationAnalysis,
  ApiCandidateMessage,
  ApiCandidateProfile,
  ApiCvParseStatus,
  CvSummary,
};

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
  linkedinUrl: string;
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
  appliedAtIso: string;
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
  linkedinUrl: string;
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
