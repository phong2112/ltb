export const GUEST_CHAT_COOKIE_NAME = "guest_chat_session";

export const CHAT_ADMIN_USER_ID = "hr-admin";

export function guestChatRoom(deviceId: string) {
  return `guest:${deviceId}`;
}

export function adminChatRoom(userId: string) {
  return `admin:${userId}`;
}
