import type { ApiTemplate, TemplateInput } from "@/app/apis/models";
import { apiRequest } from "./client";

function templatePath(templateId?: string) {
  return `/admin/templates${templateId ? `/${encodeURIComponent(templateId)}` : ""}`;
}

export function fetchAdminTemplates() {
  return apiRequest<ApiTemplate[]>(templatePath());
}

export function createAdminTemplate(form: TemplateInput) {
  return apiRequest<ApiTemplate>(templatePath(), {
    method: "POST",
    body: JSON.stringify(form),
  });
}

export function updateAdminTemplate(id: string, form: TemplateInput) {
  return apiRequest<ApiTemplate>(templatePath(id), {
    method: "PATCH",
    body: JSON.stringify(form),
  });
}

export async function deleteAdminTemplate(id: string) {
  await apiRequest<void>(templatePath(id), { method: "DELETE" });
}

