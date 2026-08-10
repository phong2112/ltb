import type { ApiJob } from "@/app/apis/models";
import type { JobInput, Job } from "@/app/data/jobs";
import { toJobPayload } from "@/app/data/jobs";
import { apiRequest } from "./client";
import { API_ENDPOINTS } from "./endpoints";

/** Loads published jobs for public career pages. */
export function getPublicJobs() {
  return apiRequest<ApiJob[]>(API_ENDPOINTS.jobs.publicList);
}

/** Loads all jobs for the admin workspace. */
export function getAdminJobs() {
  return apiRequest<ApiJob[]>(API_ENDPOINTS.jobs.adminList);
}

/** Creates a job after mapping the UI form model to the API payload. */
export function createJobRequest(job: JobInput) {
  return apiRequest<ApiJob>(API_ENDPOINTS.jobs.adminList, {
    method: "POST",
    body: JSON.stringify(toJobPayload(job)),
    notification: {
      loading: "Đang tạo vị trí tuyển dụng...",
      success: "Đã tạo vị trí tuyển dụng",
      error: "Không thể tạo vị trí tuyển dụng",
    },
  });
}

/** Updates a job after mapping the UI patch model to the API payload. */
export function updateJobRequest(id: string, patch: Partial<Job>) {
  return apiRequest<ApiJob>(API_ENDPOINTS.jobs.adminDetail(id), {
    method: "PATCH",
    body: JSON.stringify(toJobPayload(patch)),
    notification: {
      loading: "Đang cập nhật vị trí...",
      success: "Đã cập nhật vị trí tuyển dụng",
      error: "Không thể cập nhật vị trí tuyển dụng",
    },
  });
}
