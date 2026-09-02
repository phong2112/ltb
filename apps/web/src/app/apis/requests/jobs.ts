import type { ApiJob } from "@/app/apis/models";
import type { JobInput, Job } from "@/app/data/jobs";
import { toJobPayload } from "@/app/data/jobs";
import { apiJsonRequest, apiRequest } from "./client";
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
  return apiJsonRequest<ApiJob, ReturnType<typeof toJobPayload>>(API_ENDPOINTS.jobs.base, {
    method: "POST",
    body: toJobPayload(job),
  });
}

/** Updates a job after mapping the UI patch model to the API payload. */
export function updateJobRequest(id: string, patch: Partial<Job>) {
  return apiJsonRequest<ApiJob, ReturnType<typeof toJobPayload>>(API_ENDPOINTS.jobs.detail(id), {
    method: "PATCH",
    body: toJobPayload(patch),
  });
}
