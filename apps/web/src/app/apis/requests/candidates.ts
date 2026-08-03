import type {
  ApiApplicationAnalysis,
  ApiCandidateMessage,
  ApiCandidateProfile,
} from "@/app/apis/models";
import { apiRequest } from "./client";

export function getAdminCandidates(query = "") {
  return apiRequest<ApiCandidateProfile[]>(`/admin/candidates${query}`);
}

export function getApplicationAnalysis(applicationId: string) {
  return apiRequest<ApiApplicationAnalysis>(
    `/admin/candidates/applications/${applicationId}/analysis`,
  );
}

export function retryApplicationAnalysis(applicationId: string) {
  return apiRequest<ApiApplicationAnalysis>(
    `/admin/candidates/applications/${applicationId}/ai/retry`,
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

export function updateCandidateApplication(
  applicationId: string,
  body: { status?: string; followUpAt?: string | null; note?: string },
) {
  return apiRequest(`/admin/candidates/applications/${applicationId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    notification: {
      loading: "Đang cập nhật ứng viên...",
      success: "Đã cập nhật thông tin ứng viên",
      error: "Không thể cập nhật ứng viên",
    },
  });
}

export function deleteCandidateRequest(id: string) {
  return apiRequest(`/admin/candidates/${id}`, {
    method: "DELETE",
    notification: {
      loading: "Đang xóa ứng viên...",
      success: "Đã xóa ứng viên",
      error: "Không thể xóa ứng viên",
    },
  });
}

export function sendCandidateMessageRequest(
  applicationId: string,
  channel: string,
  content: string,
) {
  return apiRequest<ApiCandidateMessage>(`/admin/candidates/applications/${applicationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ channel, content }),
    notification: {
      loading: "Đang gửi tin nhắn...",
      success: "Tin nhắn đã được gửi",
      error: "Không thể gửi tin nhắn",
    },
  });
}

