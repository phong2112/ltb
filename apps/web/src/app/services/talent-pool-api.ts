import { apiRequest } from "@/app/services/api-client";

export type TalentPoolStatus =
  | "PENDING"
  | "EXTRACTING"
  | "EXTRACTED"
  | "ANALYZING"
  | "COMPLETED"
  | "FAILED";

export type TalentPoolStructuredData = {
  fullName?: string;
  email?: string;
  phone?: string;
  title?: string;
  skills?: string[];
  languages?: string[];
  yearsExperience?: number;
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

export function uploadTalentPoolFiles(files: File[], targetJobId?: string) {
  const body = new FormData();
  files.forEach(file => body.append("cvs", file));
  if (targetJobId) body.append("targetJobId", targetJobId);
  return apiRequest<{ results: TalentPoolUploadResult[] }>("/admin/talent-pool/upload", {
    method: "POST",
    body,
  });
}

export function listTalentPool(params: {
  search?: string;
  status?: TalentPoolStatus;
  tag?: string;
  page: number;
  pageSize: number;
}) {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.status) query.set("status", params.status);
  if (params.tag?.trim()) query.set("tag", params.tag.trim());
  return apiRequest<TalentPoolListResponse>(`/admin/talent-pool?${query.toString()}`);
}

export function getTalentPoolEntry(id: string) {
  return apiRequest<TalentPoolEntry>(`/admin/talent-pool/${id}`);
}

export function updateTalentPoolEntry(id: string, input: TalentPoolUpdateInput) {
  return apiRequest<TalentPoolEntry>(`/admin/talent-pool/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function promoteTalentPoolEntry(id: string, jobId: string) {
  return apiRequest<{ applicationId: string; jobId: string }>(`/admin/talent-pool/${id}/promote`, {
    method: "POST",
    body: JSON.stringify({ jobId }),
  });
}

export function deleteTalentPoolEntry(id: string) {
  return apiRequest<{ id: string }>(`/admin/talent-pool/${id}`, { method: "DELETE" });
}
