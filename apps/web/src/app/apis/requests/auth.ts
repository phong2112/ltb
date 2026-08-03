import type { ApiAuthSession } from "@/app/apis/models";
import { apiRequest } from "./client";

export function getAuthSession() {
  return apiRequest<ApiAuthSession>("/auth/me");
}

export function loginRequest(email: string, password: string) {
  return apiRequest<ApiAuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    notification: {
      loading: "Đang đăng nhập...",
      success: "Đăng nhập thành công",
      error: "Không thể đăng nhập",
    },
  });
}

export function logoutRequest() {
  return apiRequest("/auth/logout", {
    method: "POST",
    notification: {
      loading: "Đang đăng xuất...",
      success: "Đã đăng xuất",
      error: "Không thể kết nối máy chủ khi đăng xuất",
    },
  });
}

