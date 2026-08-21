import type { CvSummary } from "@hr-copilot/shared";

export const AI_PROVIDER = Symbol("AI_PROVIDER");
export type { CvSummary } from "@hr-copilot/shared";

export type MatchCriterion = {
  id: string;
  text: string;
  importance: "critical" | "required" | "preferred";
  constraintType: "quantitative" | "hard_skill" | "soft_skill" | "domain" | "general";
  required: boolean;
  blocker: boolean;
  weight: number;
};

export type CriterionStatus = "met" | "partial" | "not_met" | "unknown";

export type CriterionEvaluation = {
  criterionId: string;
  status: CriterionStatus;
  evidence: string[];
  reason: string;
};

export type ProviderMatchAnalysis = {
  summary: string;
  evaluations: CriterionEvaluation[];
};

export type AnalyzeMatchInput = {
  jobTitle: string;
  jobDescription: string;
  criteria: MatchCriterion[];
  cvText: string;
};

export type SummarizeCvInput = {
  cvText: string;
};

export type ExtractProfileInput = {
  cvText: string;
  fileName: string;
};

export type SourcingPlanInput = {
  jobTitle: string;
  seniority: string | null;
  locations: string[];
  skills: string[];
  requirements: string;
};

export type SourcingPlan = {
  titleVariants: string[];
  skillSignals: string[];
};

export type ApplicationPreviewExtractionInput = {
  cvText: string;
  fileName: string;
  allowedApplicationAreas: string[];
};

export type ExtractedProfile = {
  fullName: string | null;
  title: string | null;
  yearsExperience: number | null;
  skills: string[];
  languages: string[];
};

export type ApplicationPreviewFieldSource = "regex" | "ai" | "unknown";

export type ApplicationPreviewExtraction = {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  applicationArea: string | null;
  confidence: {
    fullName: number;
    email: number;
    phone: number;
    linkedinUrl: number;
    applicationArea: number;
  };
  evidence: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
    linkedinUrl: string | null;
    applicationArea: string | null;
  };
};

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  analyzeMatch(input: AnalyzeMatchInput): Promise<ProviderMatchAnalysis>;
  summarizeCv(input: SummarizeCvInput): Promise<CvSummary>;
  extractProfile(input: ExtractProfileInput): Promise<ExtractedProfile>;
  planSourcing(input: SourcingPlanInput): Promise<SourcingPlan>;
}
