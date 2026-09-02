import type {
  ApiApplicationAnalysis,
  ApiCandidateProfile,
} from "@/app/apis/models";
import { apiJsonDownload, apiJsonRequest, apiRequest } from "./client";
import { API_ENDPOINTS } from "./endpoints";

/** Loads admin candidate profiles, optionally with a prebuilt query string filter. */
export function getAdminCandidates(query = "") {
  return apiRequest<ApiCandidateProfile[]>(API_ENDPOINTS.candidates.adminList(query));
}

export type CvExportInput = {
  scope: "job" | "candidate" | "selected" | "filtered";
  jobId?: string;
  candidateId?: string;
  candidateIds?: string[];
  talentPoolEntryIds?: string[];
  excludedCandidateIds?: string[];
  excludedTalentPoolEntryIds?: string[];
  filters?: { q?: string; status?: string; jobId?: string };
};

/** Requests a private ZIP and immediately hands it to the browser download manager. */
export async function exportCandidateCvs(input: CvExportInput) {
  const { blob, filename } = await apiJsonDownload(API_ENDPOINTS.candidates.cvExports, {
    method: "POST",
    body: input,
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/** Fetches the latest AI/CV analysis state for one application. */
export function getApplicationAnalysis(applicationId: string) {
  return apiRequest<ApiApplicationAnalysis>(
    API_ENDPOINTS.candidates.applicationAnalysis(applicationId),
  );
}

/** Requeues AI analysis for an application whose CV parse or match needs retrying. */
export function retryApplicationAnalysis(applicationId: string) {
  return apiRequest<ApiApplicationAnalysis>(
    API_ENDPOINTS.candidates.applicationRetry(applicationId),
    {
      method: "POST",
    },
  );
}

/** Updates admin-owned application fields such as status, follow-up date, and HR note. */
export function updateCandidateApplication(
  applicationId: string,
  body: { status?: string; followUpAt?: string | null; note?: string },
) {
  return apiJsonRequest<void, { status?: string; followUpAt?: string | null; note?: string }>(API_ENDPOINTS.candidates.application(applicationId), {
    method: "PATCH",
    body,
  });
}

/** Deletes a candidate profile and its related application records through the admin API. */
export function deleteCandidateRequest(id: string) {
  return apiRequest(API_ENDPOINTS.candidates.candidate(id), {
    method: "DELETE",
  });
}
