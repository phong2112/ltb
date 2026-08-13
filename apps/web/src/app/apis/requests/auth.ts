import type { ApiAuthSession } from "@/app/apis/models";
import { currentTenantSlug } from "@/app/utils/tenant";
import { apiRequest } from "./client";
import { API_ENDPOINTS } from "./endpoints";

/** Auth endpoints that should not recursively trigger refresh attempts on 401 responses. */
const AUTH_SKIP_REFRESH_ENDPOINTS = new Set<string>([
  API_ENDPOINTS.auth.login,
  API_ENDPOINTS.auth.refresh,
  API_ENDPOINTS.auth.logout,
]);

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

/** Attempts to refresh the access token using the existing auth cookie. */
export async function refreshAccessToken(apiBase: string) {
  try {
    const response = await fetch(`${apiBase}${API_ENDPOINTS.auth.refresh}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-Slug": currentTenantSlug(),
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Prevents auth endpoints from entering a refresh loop when they return 401. */
export function shouldAttemptAuthRefresh(path: string) {
  return !AUTH_SKIP_REFRESH_ENDPOINTS.has(path);
}
