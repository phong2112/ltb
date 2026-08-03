import type { ApiJob } from "@/app/apis/models";
import type { JobInput, Job } from "@/app/data/jobs";
import { toJobPayload } from "@/app/data/jobs";
import { apiRequest } from "./client";

export function getPublicJobs() {
  return apiRequest<ApiJob[]>("/jobs/public");
}

export function getAdminJobs() {
  return apiRequest<ApiJob[]>("/admin/jobs");
}

export function createJobRequest(job: JobInput) {
  return apiRequest<ApiJob>("/admin/jobs", {
    method: "POST",
    body: JSON.stringify(toJobPayload(job)),
    notification: {
      loading: "Đang tạo vị trí tuyển dụng...",
      success: "Đã tạo vị trí tuyển dụng",
      error: "Không thể tạo vị trí tuyển dụng",
    },
  });
}

export function updateJobRequest(id: string, patch: Partial<Job>) {
  return apiRequest<ApiJob>(`/admin/jobs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(toJobPayload(patch)),
    notification: {
      loading: "Đang cập nhật vị trí...",
      success: "Đã cập nhật vị trí tuyển dụng",
      error: "Không thể cập nhật vị trí tuyển dụng",
    },
  });
}

