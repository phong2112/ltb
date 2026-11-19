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
export const CHAT_JOB_LISTING_SUGGESTION = "Đang tuyển những vị trí nào?";
export const CHAT_SUGGESTED_FAQ_LIMIT = 6;
/** Longest the guest waits on rate-limited AI before getting the offline answer; stays under the widget's 45s typing hint. */
export const CHAT_AI_RETRY_BUDGET_MS = 25_000;
export const CHAT_AI_MAX_ATTEMPTS = 3;
const CHAT_AI_MIN_RETRY_WAIT_MS = 1_000;

/** Wait before retrying a rate-limited chat reply, or null when the offline answer should be used now. */
export function chatAiRetryWaitMs(input: { retryAfterMs: number; attempt: number; elapsedMs: number }) {
  if (input.attempt >= CHAT_AI_MAX_ATTEMPTS) return null;
  const waitMs = Math.max(CHAT_AI_MIN_RETRY_WAIT_MS, input.retryAfterMs);
  return input.elapsedMs + waitMs <= CHAT_AI_RETRY_BUDGET_MS ? waitMs : null;
}

/** One bot reply per guest message: the unique (conversationId, clientMessageId) blocks duplicates across instances. */
export function botReplyClientMessageId(guestMessageId: string) {
  return `bot-reply:${guestMessageId}`;
}

export function systemClientMessageId(event: "ta-joined" | "ta-left", at: Date) {
  return `system:${event}:${at.getTime()}`;
}
