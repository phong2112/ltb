export type ChatConversationStatus = "OPEN" | "CLOSED" | "BLOCKED";
export type ChatSenderType = "GUEST" | "TA";

export type ApiChatMessage = {
  id: string;
  conversationId: string;
  senderType: ChatSenderType;
  senderUserId?: string | null;
  content: string;
  clientMessageId: string;
  readAt?: string | null;
  createdAt: string;
};

export type ApiChatCandidate = {
  id?: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
};

export type ApiChatApplication = {
  id: string;
  job?: { id: string; title: string };
};

export type ApiChatConversation = {
  id: string;
  guestDeviceId: string;
  taUserId: string;
  candidateId?: string | null;
  applicationId?: string | null;
  status: ChatConversationStatus;
  lastMessageAt?: string | null;
  candidate?: ApiChatCandidate | null;
  application?: ApiChatApplication | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiGuestChatConversation = {
  status: ChatConversationStatus;
  lastMessageAt?: string | null;
  candidate?: Pick<ApiChatCandidate, "fullName"> | null;
};

export type ApiAdminChatConversation = ApiChatConversation & {
  messages: ApiChatMessage[];
  _count: { messages: number };
};

export type ApiChatPage<T> = {
  items: T[];
  nextCursor: string | null;
};

export type ApiGuestChatSnapshot = {
  conversation: ApiGuestChatConversation | null;
  messages: ApiChatPage<ApiChatMessage>;
};

export type ApiAdminConversationDetail = ApiChatPage<ApiChatMessage> & {
  conversation: ApiChatConversation;
};

