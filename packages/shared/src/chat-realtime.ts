export const CHAT_REALTIME_PATH = "/chat/realtime";

export const CHAT_REALTIME_EVENTS = {
  ready: "chat.ready",
  messageCreated: "chat.message.created",
  conversationUpdated: "chat.conversation.updated",
  readUpdated: "chat.read.updated",
} as const;

export type ChatRealtimeRole = "GUEST" | "ADMIN";
export type ChatRealtimeSenderType = "GUEST" | "TA";
export type ChatRealtimeConversationStatus = "OPEN" | "CLOSED" | "BLOCKED";

export type ChatRealtimeTicketResponse = {
  ticket: string;
  expiresAt: string;
};

export type ChatRealtimeMessage = {
  id: string;
  conversationId: string;
  senderType: ChatRealtimeSenderType;
  senderUserId?: string | null;
  content: string;
  clientMessageId: string;
  readAt?: string | null;
  createdAt: string;
};

export type ChatRealtimeReadyEvent = {
  connectedAt: string;
};

export type ChatMessageCreatedEvent = {
  eventId: string;
  conversationId: string;
  message: ChatRealtimeMessage;
};

export type ChatConversationUpdatedEvent = {
  eventId: string;
  conversationId: string;
  status: ChatRealtimeConversationStatus;
  lastMessageAt?: string | null;
};

export type ChatReadUpdatedEvent = {
  eventId: string;
  conversationId: string;
  reader: ChatRealtimeRole;
  readAt: string;
};
