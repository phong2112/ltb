import type { InternalCandidateSuggestionResult, LinkedinDiscoveryResult, SourcedProfile, SourcingCampaign, SourcingImportResult, SourcingProfileStatus, SourcingSource } from "@/app/apis/models/sourcing";
import { apiRequest } from "./client";

export function listSourcingCampaigns() {
  return apiRequest<SourcingCampaign[]>("/admin/sourcing");
}

export function getSourcingCampaign(id: string) {
  return apiRequest<SourcingCampaign>(`/admin/sourcing/${id}`);
}

export function createSourcingCampaign(input: { jobId: string; name?: string }) {
  return apiRequest<SourcingCampaign>("/admin/sourcing", {
    method: "POST",
    body: JSON.stringify(input),
    notification: {
      loading: "Đang tạo bộ tìm kiếm đa nguồn...",
      success: "Đã tạo chiến dịch sourcing",
      error: "Không thể tạo chiến dịch sourcing",
    },
  });
}

export function importSourcingProfiles(campaignId: string, source: SourcingSource, urls: string[]) {
  return apiRequest<SourcingImportResult>(`/admin/sourcing/${campaignId}/profiles`, {
    method: "POST",
    body: JSON.stringify({ source, urls }),
    notification: {
      loading: "Đang thêm hồ sơ sourcing...",
      success: "Đã cập nhật danh sách ứng viên",
      error: "Không thể thêm hồ sơ sourcing",
    },
  });
}

export function discoverLinkedinProfiles(campaignId: string) {
  return apiRequest<LinkedinDiscoveryResult>(`/admin/sourcing/${campaignId}/discover/linkedin`, {
    method: "POST",
    notification: {
      loading: "Đang tìm ứng viên LinkedIn từ JD...",
      success: "Đã cập nhật shortlist LinkedIn",
      error: "Không thể chạy LinkedIn discovery",
    },
  });
}

export function suggestInternalCandidates(campaignId: string) {
  return apiRequest<InternalCandidateSuggestionResult>(`/admin/sourcing/${campaignId}/suggest/internal`, {
    method: "POST",
    notification: {
      loading: "Đang tìm ứng viên phù hợp trong hệ thống...",
      success: "Đã cập nhật gợi ý ứng viên nội bộ",
      error: "Không thể gợi ý ứng viên nội bộ",
    },
  });
}

export function updateSourcingProfileStatus(
  campaignId: string,
  profileId: string,
  status: SourcingProfileStatus,
) {
  return apiRequest<SourcedProfile>(`/admin/sourcing/${campaignId}/profiles/${profileId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
    notification: {
      loading: "Đang cập nhật trạng thái...",
      success: "Đã cập nhật trạng thái",
      error: "Không thể cập nhật trạng thái",
    },
  });
}
