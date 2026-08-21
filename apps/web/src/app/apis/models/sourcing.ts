/** API funnel status for a sourced profile inside a sourcing campaign. */
export type ApiSourcingProfileStatus =
  | "SOURCED"
  | "QUALIFIED"
  | "CONTACT_READY"
  | "CONTACTED"
  | "REPLIED"
  | "INTERESTED"
  | "SCREENING"
  | "INTERVIEW"
  | "OFFER"
  | "HIRED"
  | "REJECTED"
  | "NOT_A_FIT";

/** API source enum for where a sourced profile came from. */
export type ApiSourcingSource =
  | "LINKEDIN"
  | "TALENT_POOL"
  | "GITHUB"
  | "PUBLIC_WEB"
  | "FACEBOOK"
  | "ITVIEC"
  | "VIETNAMWORKS"
  | "ZALO"
  | "GITLAB"
  | "STACK_OVERFLOW"
  | "MANUAL"
  | "CSV"
  | "REFERRAL";

/** API location scope used when automatic LinkedIn discovery builds search queries. */
export type ApiSourcingDiscoveryLocationScope = "VIETNAM" | "GLOBAL";

/** API search query generated from a JD for one sourcing source. */
export type ApiSourcingSearchQuery = {
  id: string;
  source: ApiSourcingSource;
  type: "PEOPLE" | "BROAD" | "XRAY" | "REPOSITORY" | "JOB_BOARD" | "SOCIAL" | "WEB";
  label: string;
  query: string;
  searchUrl: string;
  priority: number;
};

/** API sourced profile stored in a campaign pipeline. */
export type ApiSourcedProfile = {
  id: string;
  source: ApiSourcingSource;
  profileUrl: string;
  normalizedProfileUrl: string;
  displayName?: string | null;
  headline?: string | null;
  location?: string | null;
  notes?: string | null;
  status: ApiSourcingProfileStatus;
  extractionMethod: string;
  createdAt: string;
  updatedAt: string;
};

/** API sourcing campaign detail including brief, generated queries, job, and profiles. */
export type ApiSourcingCampaign = {
  id: string;
  jobId: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "CLOSED";
  discoveryLocationScope: ApiSourcingDiscoveryLocationScope;
  brief: {
    targetRole?: string;
    seniority?: string | null;
    locations?: string[];
    mustHave?: string[];
    skills?: string[];
    titleVariants?: string[];
    sourcePriority?: string[];
  };
  searchQueries: ApiSourcingSearchQuery[];
  job: {
    id: string;
    title: string;
    company?: string | null;
    status: string;
    locations: string[];
  };
  profiles?: ApiSourcedProfile[];
  _count: { profiles: number };
  createdAt: string;
  updatedAt: string;
};

/** API response after importing profile URLs into a sourcing campaign. */
export type ApiSourcingImportResult = {
  createdCount: number;
  duplicateCount: number;
  foundInOtherCampaignCount: number;
  invalidUrls: string[];
  profiles: ApiSourcedProfile[];
};

/** API response after running automatic LinkedIn discovery through the search provider. */
export type ApiLinkedinDiscoveryResult = {
  provider: "brave";
  providerStatus: "COMPLETED" | "DEGRADED" | "UNAVAILABLE";
  createdCount: number;
  duplicateCount: number;
  queryCount: number;
  successfulQueryCount: number;
  resultCount: number;
  skippedQueries: string[];
  failures: Array<{
    queryId: string;
    code: "AUTHENTICATION" | "INVALID_REQUEST" | "RATE_LIMIT" | "TIMEOUT" | "UPSTREAM" | "NETWORK" | "INVALID_RESPONSE" | "DISABLED" | "CONFIGURATION" | "UNKNOWN";
    message: string;
    retryable: boolean;
    attempts: number;
    status?: number;
  }>;
  profiles: ApiSourcedProfile[];
};

/** API response from the retrieval-first, human-in-the-loop sourcing workflow. */
export type ApiSourcingOrchestrationResult = {
  status: "COMPLETED" | "DEGRADED";
  strategy: "retrieval_first_human_in_loop";
  aiAssisted: boolean;
  createdCount: number;
  resultCount: number;
  stages: Array<{
    stage: "AI_QUERY_PLANNING" | "INTERNAL_DISCOVERY" | "PUBLIC_WEB_DISCOVERY";
    status: "COMPLETED" | "DEGRADED" | "SKIPPED" | "FAILED";
    message: string;
    createdCount?: number;
    resultCount?: number;
  }>;
  profiles: ApiSourcedProfile[];
};

/** API response after suggesting existing internal candidates for a sourcing campaign. */
export type ApiInternalCandidateSuggestionResult = {
  createdCount: number;
  duplicateCount: number;
  resultCount: number;
  profiles: ApiSourcedProfile[];
};
