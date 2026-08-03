import type { NewCandidate } from "@/app/data/candidates";
import { apiRequest } from "./client";

export function submitApplication(candidate: NewCandidate) {
  const form = new FormData();
  form.set("jobId", candidate.jobId);
  form.set("fullName", candidate.name);
  form.set("email", candidate.email);
  form.set("phone", candidate.phone);
  form.set("applicationArea", candidate.applicationArea);
  form.set("consentAccepted", "true");

  if (candidate.note.trim()) {
    form.set("screeningAnswers", candidate.note.trim());
  }

  if (candidate.questionAnswers?.length) {
    form.set("questionAnswers", JSON.stringify(candidate.questionAnswers));
  }

  if (candidate.cvFile) {
    form.set("cv", candidate.cvFile);
  }

  return apiRequest("/applications", {
    method: "POST",
    body: form,
    notification: {
      loading: "Đang gửi hồ sơ ứng tuyển...",
      success: "Hồ sơ đã được gửi thành công",
      error: "Không thể gửi hồ sơ ứng tuyển",
    },
  });
}

