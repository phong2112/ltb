import type { ApiAuthSession } from "@/app/apis/models";
import { apiRequest } from "./client";
import { API_ENDPOINTS } from "./endpoints";

/** Loads the current admin session from the auth cookie. */
export function getAuthSession() {
  return apiRequest<ApiAuthSession>(API_ENDPOINTS.auth.me);
}

/** Sends admin credentials and relies on the API to set auth cookies. */
export function loginRequest(email: string, password: string) {
  return apiRequest<ApiAuthSession>(API_ENDPOINTS.auth.login, {
    method: "POST",
    body: JSON.stringify({ email, password }),
    notification: {
      loading: "Đang đăng nhập...",
      success: "Đăng nhập thành công",
      error: "Không thể đăng nhập",
    },
  });
}

/** Logs out the current admin session and clears auth cookies server-side. */
export function logoutRequest() {
  return apiRequest(API_ENDPOINTS.auth.logout, {
    method: "POST",
    notification: {
      loading: "Đang đăng xuất...",
      success: "Đã đăng xuất",
      error: "Không thể kết nối máy chủ khi đăng xuất",
    },
  });
}
