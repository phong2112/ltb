import type { ApiChatKnowledgeEntry, ApiChatKnowledgeInput } from "../models/chat";
import { apiJsonRequest, apiRequest } from "./client";
import { API_ENDPOINTS } from "./endpoints";

export function listChatKnowledge() {
  return apiRequest<ApiChatKnowledgeEntry[]>(API_ENDPOINTS.adminChat.knowledge);
}

export function createChatKnowledgeEntry(input: ApiChatKnowledgeInput) {
  return apiJsonRequest<ApiChatKnowledgeEntry, ApiChatKnowledgeInput>(API_ENDPOINTS.adminChat.knowledge, {
    method: "POST",
    body: input,
  });
}

export function updateChatKnowledgeEntry(id: string, input: Partial<ApiChatKnowledgeInput>) {
  return apiJsonRequest<ApiChatKnowledgeEntry, Partial<ApiChatKnowledgeInput>>(API_ENDPOINTS.adminChat.knowledgeEntry(id), {
    method: "PATCH",
    body: input,
  });
}

export async function deleteChatKnowledgeEntry(id: string) {
  await apiRequest<{ id: string }>(API_ENDPOINTS.adminChat.knowledgeEntry(id), { method: "DELETE" });
}
