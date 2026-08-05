export type SourcingProfileStatus =
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

export type SourcingSource =
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

export type SourcingSearchQuery = {
  id: string;
  source: SourcingSource;
  type: "PEOPLE" | "BROAD" | "XRAY" | "REPOSITORY" | "JOB_BOARD" | "SOCIAL" | "WEB";
  label: string;
  query: string;
  searchUrl: string;
  priority: number;
};

export type SourcedProfile = {
  id: string;
  source: SourcingSource;
  profileUrl: string;
  normalizedProfileUrl: string;
  displayName?: string | null;
  headline?: string | null;
  location?: string | null;
  notes?: string | null;
  status: SourcingProfileStatus;
  extractionMethod: string;
  createdAt: string;
  updatedAt: string;
};

export type SourcingCampaign = {
  id: string;
  jobId: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "CLOSED";
  brief: {
    targetRole?: string;
    seniority?: string | null;
    locations?: string[];
    mustHave?: string[];
    skills?: string[];
    titleVariants?: string[];
    sourcePriority?: string[];
  };
  searchQueries: SourcingSearchQuery[];
  job: {
    id: string;
    title: string;
    company?: string | null;
    status: string;
    locations: string[];
  };
  profiles?: SourcedProfile[];
  _count: { profiles: number };
  createdAt: string;
  updatedAt: string;
};

export type SourcingImportResult = {
  createdCount: number;
  duplicateCount: number;
  foundInOtherCampaignCount: number;
  invalidUrls: string[];
  profiles: SourcedProfile[];
};
