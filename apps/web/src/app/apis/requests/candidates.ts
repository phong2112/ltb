import type {
  ApiApplicationAnalysis,
  ApiCandidateMessage,
  ApiCandidateProfile,
} from "@/app/apis/models";
import { apiRequest } from "./client";
import { API_ENDPOINTS } from "./endpoints";

/** Loads admin candidate profiles, optionally with a prebuilt query string filter. */
export function getAdminCandidates(query = "") {
  return apiRequest<ApiCandidateProfile[]>(API_ENDPOINTS.candidates.adminList(query));
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
      notification: {
        loading: "Đang chạy lại phân tích AI...",
        success: "Đã đưa hồ sơ vào hàng đợi AI",
        error: "Không thể chạy lại phân tích AI",
      },
    },
  );
}

/** Updates admin-owned application fields such as status, follow-up date, and HR note. */
export function updateCandidateApplication(
  applicationId: string,
  body: { status?: string; followUpAt?: string | null; note?: string },
  options: { silent?: boolean } = {},
) {
  return apiRequest(API_ENDPOINTS.candidates.application(applicationId), {
    method: "PATCH",
    body: JSON.stringify(body),
    notification: options.silent
      ? undefined
      : {
          loading: "Đang cập nhật ứng viên...",
          success: "Đã cập nhật thông tin ứng viên",
          error: "Không thể cập nhật ứng viên",
        },
  });
}

/** Deletes a candidate profile and its related application records through the admin API. */
export function deleteCandidateRequest(id: string) {
  return apiRequest(API_ENDPOINTS.candidates.candidate(id), {
    method: "DELETE",
    notification: {
      loading: "Đang xóa ứng viên...",
      success: "Đã xóa ứng viên",
      error: "Không thể xóa ứng viên",
    },
  });
}

/** Sends an outbound candidate message on the selected communication channel. */
export function sendCandidateMessageRequest(
  applicationId: string,
  channel: string,
  content: string,
) {
  return apiRequest<ApiCandidateMessage>(API_ENDPOINTS.candidates.applicationMessages(applicationId), {
    method: "POST",
    body: JSON.stringify({ channel, content }),
    notification: {
      loading: "Đang gửi tin nhắn...",
      success: "Tin nhắn đã được gửi",
      error: "Không thể gửi tin nhắn",
    },
  });
}
