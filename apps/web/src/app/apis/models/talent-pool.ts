import type { CvSummary, TalentPoolStatus, TalentPoolUploadResult } from "@hr-copilot/shared";

export type { TalentPoolStatus };

/** API structured CV data extracted for a talent pool entry. */
export type ApiTalentPoolStructuredData = {
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

/** API candidate summary embedded in talent pool list/detail responses. */
export type ApiTalentPoolCandidate = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
};

/** API file metadata for a CV stored with a talent pool entry. */
export type ApiTalentPoolFile = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

/** API talent pool row returned by paginated list requests. */
export type ApiTalentPoolListItem = {
  id: string;
  status: TalentPoolStatus;
  candidate: ApiTalentPoolCandidate;
  fileId: string | null;
  tags: string[];
  summary: string | null;
  structuredData: ApiTalentPoolStructuredData | null;
  promotedApplicationId: string | null;
  createdAt: string;
  updatedAt: string;
};

/** API talent pool detail response with extracted text, notes, and optional CV file metadata. */
export type ApiTalentPoolEntry = Omit<ApiTalentPoolListItem, "fileId"> & {
  candidateId: string;
  extractedText: string | null;
  errorMessage: string | null;
  notes: string | null;
  file: ApiTalentPoolFile | null;
};

/** API paginated response for talent pool list requests. */
export type ApiTalentPoolListResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: ApiTalentPoolListItem[];
};

/** API per-file result returned after bulk talent pool CV upload. */
export type ApiTalentPoolUploadResult = TalentPoolUploadResult;

/** API payload for updating editable talent pool profile fields. */
export type ApiTalentPoolUpdateInput = {
  fullName?: string;
  email?: string;
  phone?: string;
  title?: string;
  skills?: string[];
  tags?: string[];
  notes?: string;
};
