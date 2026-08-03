import type { CvSummary, TalentPoolStatus } from "@hr-copilot/shared";

export type { TalentPoolStatus };

export type TalentPoolStructuredData = {
  fullName?: string;
  email?: string;
  phone?: string;
  title?: string;
  skills?: string[];
  languages?: string[];
  yearsExperience?: number;
  cvSummary?: CvSummary;
  linkedinUrl?: string;
  portfolioUrl?: string;
  [key: string]: unknown;
};

export type TalentPoolCandidate = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
};

export type TalentPoolFile = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

export type TalentPoolListItem = {
  id: string;
  status: TalentPoolStatus;
  candidate: TalentPoolCandidate;
  fileId: string | null;
  tags: string[];
  summary: string | null;
  structuredData: TalentPoolStructuredData | null;
  promotedApplicationId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TalentPoolEntry = Omit<TalentPoolListItem, "fileId"> & {
  candidateId: string;
  extractedText: string | null;
  errorMessage: string | null;
  notes: string | null;
  file: TalentPoolFile | null;
};

export type TalentPoolListResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: TalentPoolListItem[];
};

export type TalentPoolUploadResult = {
  fileName: string;
  status: "created" | "duplicate" | "error";
  entryId?: string;
  reason?: string;
};

export type TalentPoolUpdateInput = {
  fullName?: string;
  email?: string;
  phone?: string;
  title?: string;
  skills?: string[];
  tags?: string[];
  notes?: string;
};
