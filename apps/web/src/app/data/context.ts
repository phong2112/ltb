import { createContext } from "react";
import type { AiAnalysisStatus, Candidate, CandidateMessageChannel, CandidateProfile, CandidateStatus, NewCandidate } from "./candidates/types";
import type { LoginResult } from "./auth/types";
import type { Job, JobInput } from "./jobs/types";

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
  reloadAdminData: (status?: CandidateStatus) => Promise<void>;
  refreshCandidateAnalysis: (applicationId: string) => Promise<AiAnalysisStatus>;
  retryCandidateAnalysis: (applicationId: string) => Promise<AiAnalysisStatus>;
  addJob: (j: JobInput) => Promise<void>;
  updateJob: (id: string, patch: Partial<Job>) => Promise<void>;
  addCandidate: (c: NewCandidate) => Promise<void>;
  updateCandidate: (id: string, patch: Partial<Candidate>) => Promise<void>;
  deleteCandidate: (id: string) => Promise<void>;
  sendCandidateMessage: (applicationId: string, channel: CandidateMessageChannel, content: string) => Promise<void>;
  isJobSaved: (id: string) => boolean;
  toggleSavedJob: (id: string) => boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
};

export const DataContext = createContext<DataCtx>(null!);

