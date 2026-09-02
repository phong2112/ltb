import type { ApiTemplate, ApiTemplateInput } from "@/app/apis/models";
import { apiJsonRequest, apiRequest } from "./client";
import { API_ENDPOINTS } from "./endpoints";

/** Builds the templates collection/detail endpoint from the shared endpoint map. */
function templatePath(templateId?: string) {
  return templateId ? API_ENDPOINTS.templates.detail(templateId) : API_ENDPOINTS.templates.list;
}

/** Loads all admin message templates. */
export function fetchAdminTemplates() {
  return apiRequest<ApiTemplate[]>(templatePath());
}

/** Creates a reusable admin message template. */
export function createAdminTemplate(form: ApiTemplateInput) {
  return apiJsonRequest<ApiTemplate, ApiTemplateInput>(templatePath(), {
    method: "POST",
    body: form,
  });
}

/** Updates an existing admin message template. */
export function updateAdminTemplate(id: string, form: ApiTemplateInput) {
  return apiJsonRequest<ApiTemplate, ApiTemplateInput>(templatePath(id), {
    method: "PATCH",
    body: form,
  });
}

/** Deletes an admin message template. */
export async function deleteAdminTemplate(id: string) {
  await apiRequest<void>(templatePath(id), { method: "DELETE" });
}
