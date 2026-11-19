export const GUEST_CHAT_COOKIE_NAME = "guest_chat_session";

export const CHAT_ADMIN_USER_ID = "hr-admin";

export function guestChatRoom(deviceId: string) {
  return `guest:${deviceId}`;
}

export function adminChatRoom(userId: string) {
  return `admin:${userId}`;
}

export const CHAT_BOT_DISPLAY_NAME = "Trợ lý tuyển dụng";
export const CHAT_TA_DISPLAY_NAME = "chị Bích";
export const CHAT_BOT_HISTORY_LIMIT = 12;

/** One bot reply per guest message: the unique (conversationId, clientMessageId) blocks duplicates across instances. */
export function botReplyClientMessageId(guestMessageId: string) {
  return `bot-reply:${guestMessageId}`;
}

export function systemClientMessageId(event: "ta-joined" | "ta-left", at: Date) {
  return `system:${event}:${at.getTime()}`;
}
