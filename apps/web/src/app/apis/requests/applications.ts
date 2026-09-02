import type { ApiApplicationCvPreview } from "@/app/apis/models";
import type { NewCandidate } from "@/app/data/candidates";
import { apiRequest } from "./client";
import { API_ENDPOINTS } from "./endpoints";

/** Requests a lightweight CV parse preview used to autofill the public application form. */
export function previewApplicationCv(file: File, jobLocations: string[]) {
  const form = new FormData();
  form.set("cv", file);
  form.set("jobLocations", JSON.stringify(jobLocations));

  return apiRequest<ApiApplicationCvPreview>(API_ENDPOINTS.applications.cvPreview, {
    method: "POST",
    body: form,
  });
}

/** Submits a public candidate application with profile fields, answers, consent, and optional CV. */
export function submitApplication(candidate: NewCandidate) {
  const form = new FormData();
  form.set("jobId", candidate.jobId);
  form.set("fullName", candidate.name);
  form.set("email", candidate.email);
  form.set("phone", candidate.phone);
  form.set("applicationArea", candidate.applicationArea);
  form.set("consentAccepted", "true");

  if (candidate.linkedinUrl?.trim()) {
    form.set("linkedinUrl", candidate.linkedinUrl.trim());
  }

  if (candidate.note.trim()) {
    form.set("screeningAnswers", candidate.note.trim());
  }

  if (candidate.questionAnswers?.length) {
    form.set("questionAnswers", JSON.stringify(candidate.questionAnswers));
  }

  if (candidate.cvFile) {
    form.set("cv", candidate.cvFile);
  }

  return apiRequest(API_ENDPOINTS.applications.submit, {
    method: "POST",
    body: form,
  });
}
