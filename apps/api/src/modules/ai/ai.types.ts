export const AI_PROVIDER = Symbol("AI_PROVIDER");

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

export type CvSummary = {
  overview: string;
  currentTitle: string | null;
  totalExperience: string | null;
  keySkills: string[];
  workHighlights: string[];
  education: string[];
  languages: string[];
  notesForTa: string[];
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
  summarizeCv(input: SummarizeCvInput): Promise<CvSummary>;
  extractProfile(input: ExtractProfileInput): Promise<ExtractedProfile>;
}
