import type { ChatRealtimeTicketResponse } from "@hr-copilot/shared";
import type {
  ApiAdminChatConversation,
  ApiAdminChatUnreadSummary,
  ApiAdminConversationDetail,
  ApiChatConversation,
  ApiGuestChatSnapshot,
  ApiChatMessage,
  ApiChatPage,
  ChatConversationStatus,
} from "../models/chat";
import { apiJsonRequest, apiRequest } from "./client";
import { API_ENDPOINTS } from "./endpoints";

type RecoveryResponse = { recoveryToken: string };
type SendMessageInput = { content: string; clientMessageId: string };

export function createGuestChatSession() {
  return apiRequest<RecoveryResponse>(API_ENDPOINTS.chat.session, {
    method: "POST",
    skipAuthRefresh: true,
  });
}

export function restoreGuestChatSession(recoveryToken: string) {
  return apiJsonRequest<RecoveryResponse, { recoveryToken: string }>(API_ENDPOINTS.chat.restore, {
    method: "POST",
    skipAuthRefresh: true,
    body: { recoveryToken },
  });
}

export function resetGuestChatSession() {
  return apiRequest<RecoveryResponse>(API_ENDPOINTS.chat.reset, {
    method: "POST",
    skipAuthRefresh: true,
  });
}

export function createGuestChatRealtimeTicket() {
  return apiRequest<ChatRealtimeTicketResponse>(API_ENDPOINTS.chat.realtimeTicket, {
    method: "POST",
    skipAuthRefresh: true,
  });
}

export async function getGuestChatSnapshot() {
  const response = await apiRequest<ApiGuestChatSnapshot | undefined>(API_ENDPOINTS.chat.conversation, {
    skipAuthRefresh: true,
  });
  return response ?? { conversation: null, messages: { items: [], nextCursor: null } };
}

export function sendGuestChatMessage(input: SendMessageInput) {
  return apiJsonRequest<ApiChatMessage, SendMessageInput>(API_ENDPOINTS.chat.messages, {
    method: "POST",
    skipAuthRefresh: true,
    body: input,
  });
}

export function markGuestChatRead() {
  return apiRequest<{ count: number }>(API_ENDPOINTS.chat.read, {
    method: "POST",
    skipAuthRefresh: true,
  });
}

export function createAdminChatRealtimeTicket() {
  return apiRequest<ChatRealtimeTicketResponse>(API_ENDPOINTS.adminChat.realtimeTicket, { method: "POST" });
}

export function listAdminChatConversations(input: { q?: string; cursor?: string } = {}) {
  const params = new URLSearchParams();
  if (input.q) params.set("q", input.q);
  if (input.cursor) params.set("cursor", input.cursor);
  const query = params.size ? `?${params}` : "";
  return apiRequest<ApiChatPage<ApiAdminChatConversation>>(`${API_ENDPOINTS.adminChat.conversations}${query}`);
}

export function getAdminChatUnreadSummary() {
  return apiRequest<ApiAdminChatUnreadSummary>(API_ENDPOINTS.adminChat.unreadSummary);
}

export function getAdminChatConversation(id: string, cursor?: string) {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return apiRequest<ApiAdminConversationDetail>(`${API_ENDPOINTS.adminChat.conversation(id)}${query}`);
}

export function sendAdminChatMessage(id: string, input: SendMessageInput) {
  return apiJsonRequest<ApiChatMessage, SendMessageInput>(API_ENDPOINTS.adminChat.messages(id), {
    method: "POST",
    body: input,
  });
}

export function markAdminChatRead(id: string) {
  return apiRequest<{ count: number }>(API_ENDPOINTS.adminChat.read(id), { method: "POST" });
}

export function updateAdminChatStatus(id: string, status: ChatConversationStatus) {
  return apiJsonRequest<ApiChatConversation, { status: ChatConversationStatus }>(API_ENDPOINTS.adminChat.status(id), {
    method: "PATCH",
    body: { status },
  });
}
