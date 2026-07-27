export const AI_PROVIDER = Symbol("AI_PROVIDER");

export type MatchCriterion = {
  id: string;
  text: string;
  required: boolean;
  weight: number;
};

export type CriterionStatus = "met" | "partial" | "not_met" | "unknown";

export type CriterionEvaluation = {
  criterionId: string;
  status: CriterionStatus;
  evidence: string[];
  reason: string;
};

type CandidateProfile = {
  currentRole: string | null;
  totalYearsExperience: number | null;
  skills: string[];
  languages: string[];
};

export type ProviderMatchAnalysis = {
  profile: CandidateProfile;
  summary: string;
  evaluations: CriterionEvaluation[];
  strengths: string[];
  risks: string[];
  screeningQuestions: string[];
};

export type AnalyzeMatchInput = {
  jobTitle: string;
  jobDescription: string;
  criteria: MatchCriterion[];
  cvText: string;
};

export type ExtractProfileInput = {
  cvText: string;
  fileName: string;
};

export type ExtractedProfile = {
  fullName: string | null;
  title: string | null;
  yearsExperience: number | null;
  skills: string[];
  languages: string[];
};

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  analyzeMatch(input: AnalyzeMatchInput): Promise<ProviderMatchAnalysis>;
  extractProfile(input: ExtractProfileInput): Promise<ExtractedProfile>;
}
