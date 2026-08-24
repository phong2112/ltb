import type { ApiInternalCandidateSuggestionResult, ApiLinkedinDiscoveryResult, ApiSourcedProfile, ApiSourcingCampaign, ApiSourcingCampaignStatus, ApiSourcingDiscoveryLocationScope, ApiSourcingImportResult, ApiSourcingOrchestrationQueueResult, ApiSourcingProfileFeedback, ApiSourcingProfileStatus, ApiSourcingSource } from "@/app/apis/models/sourcing";
import { apiRequest } from "./client";
import { API_ENDPOINTS } from "./endpoints";

/** Lists sourcing campaigns for the admin sourcing dashboard. */
export function listSourcingCampaigns() {
  return apiRequest<ApiSourcingCampaign[]>(API_ENDPOINTS.sourcing.campaigns);
}

/** Loads one sourcing campaign with its job, queries, and sourced profiles. */
export function getSourcingCampaign(id: string) {
  return apiRequest<ApiSourcingCampaign>(API_ENDPOINTS.sourcing.campaign(id));
}

/** Updates whether a sourcing campaign can run automatic discovery. */
export function updateSourcingCampaignStatus(campaignId: string, status: ApiSourcingCampaignStatus) {
  return apiRequest<ApiSourcingCampaign>(API_ENDPOINTS.sourcing.campaignStatus(campaignId), {
    method: "PATCH",
    body: JSON.stringify({ status }),
    notification: {
      loading: "Đang cập nhật chiến dịch...",
      success: "Đã cập nhật chiến dịch",
      error: "Không thể cập nhật chiến dịch",
    },
  });
}

/** Creates a sourcing campaign from a target job and optional discovery scope. */
export function createSourcingCampaign(input: { jobId: string; name?: string; discoveryLocationScope?: ApiSourcingDiscoveryLocationScope }) {
  return apiRequest<ApiSourcingCampaign>(API_ENDPOINTS.sourcing.campaigns, {
    method: "POST",
    body: JSON.stringify(input),
    notification: {
      loading: "Đang tạo bộ tìm kiếm đa nguồn...",
      success: "Đã tạo chiến dịch sourcing",
      error: "Không thể tạo chiến dịch sourcing",
    },
  });
}

/** Imports pasted profile URLs into a campaign after API-side normalization and dedupe. */
export function importSourcingProfiles(campaignId: string, source: ApiSourcingSource, urls: string[]) {
  return apiRequest<ApiSourcingImportResult>(API_ENDPOINTS.sourcing.profiles(campaignId), {
    method: "POST",
    body: JSON.stringify({ source, urls }),
    notification: {
      loading: "Đang thêm hồ sơ sourcing...",
      success: "Đã cập nhật danh sách ứng viên",
      error: "Không thể thêm hồ sơ sourcing",
    },
  });
}

/** Runs assisted LinkedIn discovery for a campaign through the configured search provider. */
export function discoverLinkedinProfiles(campaignId: string) {
  return apiRequest<ApiLinkedinDiscoveryResult>(API_ENDPOINTS.sourcing.linkedinDiscovery(campaignId), {
    method: "POST",
    notification: {
      loading: "Đang tìm ứng viên LinkedIn từ JD...",
      success: "Đã cập nhật shortlist LinkedIn",
      error: "Không thể chạy LinkedIn discovery",
    },
  });
}

/** Queues AI-assisted query planning, internal retrieval, and public-web discovery. */
export function runSourcingOrchestration(campaignId: string) {
  return apiRequest<ApiSourcingOrchestrationQueueResult>(API_ENDPOINTS.sourcing.run(campaignId), {
    method: "POST",
    notification: {
      loading: "Đang xếp sourcing orchestration...",
      success: "Workflow sourcing đã được xếp hàng",
      error: "Không thể xếp sourcing orchestration",
    },
  });
}

/** Suggests candidates already stored in the system for the campaign's target job. */
export function suggestInternalCandidates(campaignId: string) {
  return apiRequest<ApiInternalCandidateSuggestionResult>(API_ENDPOINTS.sourcing.internalSuggestions(campaignId), {
    method: "POST",
    notification: {
      loading: "Đang tìm ứng viên phù hợp trong hệ thống...",
      success: "Đã cập nhật gợi ý ứng viên nội bộ",
      error: "Không thể gợi ý ứng viên nội bộ",
    },
  });
}

/** Updates the funnel status for one sourced profile in a campaign. */
export function updateSourcingProfileStatus(
  campaignId: string,
  profileId: string,
  status: ApiSourcingProfileStatus,
) {
  return apiRequest<ApiSourcedProfile>(API_ENDPOINTS.sourcing.profileStatus(campaignId, profileId), {
    method: "PATCH",
    body: JSON.stringify({ status }),
    notification: {
      loading: "Đang cập nhật trạng thái...",
      success: "Đã cập nhật trạng thái",
      error: "Không thể cập nhật trạng thái",
    },
  });
}

/** Records TA relevance feedback independently from the recruiting funnel status. */
export function updateSourcingProfileFeedback(
  campaignId: string,
  profileId: string,
  feedback: ApiSourcingProfileFeedback | null,
) {
  return apiRequest<ApiSourcedProfile>(API_ENDPOINTS.sourcing.profileFeedback(campaignId, profileId), {
    method: "PATCH",
    body: JSON.stringify({ feedback }),
    notification: {
      loading: "Đang lưu đánh giá...",
      success: "Đã lưu đánh giá",
      error: "Không thể lưu đánh giá",
    },
  });
}
