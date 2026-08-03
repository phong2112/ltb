import type {
  TalentPoolEntry,
  TalentPoolListResponse,
  TalentPoolStatus,
  TalentPoolUpdateInput,
  TalentPoolUploadResult,
} from "@/app/apis/models/talent-pool";
import { apiRequest } from "./client";

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

