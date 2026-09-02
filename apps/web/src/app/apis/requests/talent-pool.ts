import type {
  ApiTalentPoolEntry,
  ApiTalentPoolListResponse,
  TalentPoolStatus,
  ApiTalentPoolUpdateInput,
  ApiTalentPoolUploadResult,
} from "@/app/apis/models/talent-pool";
import { apiJsonRequest, apiRequest } from "./client";
import { API_ENDPOINTS } from "./endpoints";

/** Uploads one or more CV files into the talent pool, optionally targeting a job. */
export function uploadTalentPoolFiles(files: File[], targetJobId?: string) {
  const body = new FormData();
  files.forEach(file => body.append("cvs", file));
  if (targetJobId) body.append("targetJobId", targetJobId);
  return apiRequest<{ results: ApiTalentPoolUploadResult[] }>(API_ENDPOINTS.talentPool.upload, {
    method: "POST",
    body,
  });
}

/** Lists talent pool entries with server-side filtering and pagination. */
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
  return apiRequest<ApiTalentPoolListResponse>(`${API_ENDPOINTS.talentPool.list}?${query.toString()}`);
}

/** Loads one talent pool entry detail for review/edit screens. */
export function getTalentPoolEntry(id: string) {
  return apiRequest<ApiTalentPoolEntry>(API_ENDPOINTS.talentPool.entry(id));
}

/** Re-runs CV extraction and AI summary after HR requests verification. */
export function retryTalentPoolAiVerification(id: string) {
  return apiRequest<ApiTalentPoolEntry>(API_ENDPOINTS.talentPool.aiRetry(id), { method: "POST" });
}

/** Updates editable talent pool profile fields and reviewer notes. */
export function updateTalentPoolEntry(id: string, input: ApiTalentPoolUpdateInput) {
  return apiJsonRequest<ApiTalentPoolEntry, ApiTalentPoolUpdateInput>(API_ENDPOINTS.talentPool.entry(id), {
    method: "PATCH",
    body: input,
  });
}

/** Promotes a talent pool entry into an application for a selected job. */
export function promoteTalentPoolEntry(id: string, jobId: string) {
  return apiJsonRequest<{ applicationId: string; jobId: string }, { jobId: string }>(API_ENDPOINTS.talentPool.promote(id), {
    method: "POST",
    body: { jobId },
  });
}

/** Deletes a talent pool entry from the admin workspace. */
export function deleteTalentPoolEntry(id: string) {
  return apiRequest<{ id: string }>(API_ENDPOINTS.talentPool.entry(id), { method: "DELETE" });
}
