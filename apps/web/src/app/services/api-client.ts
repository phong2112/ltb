import {
  notificationService,
  type ActionNotification,
} from "@/app/services/notification";

export const API_BASE = (
  (import.meta.env.VITE_API_BASE_PATH as string | undefined) ?? "/api"
).replace(/\/$/, "");

type ApiRequestInit = RequestInit & {
  skipAuthRefresh?: boolean;
  notification?: ActionNotification;
};

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}) {
  const { skipAuthRefresh, notification, ...requestInit } = init;
  const notificationId = notification
    ? notificationService.loading(notification.loading)
    : undefined;

  try {
    let response = await sendRequest(path, requestInit);

    if (
      response.status === 401 &&
      !skipAuthRefresh &&
      shouldAttemptAuthRefresh(path)
    ) {
      const refreshed = await refreshAccessToken();
      if (refreshed) response = await sendRequest(path, requestInit);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const message = parseApiErrorMessage(body);
      throw new ApiRequestError(
        message || `Request failed with status ${response.status}`,
        response.status,
      );
    }

    const result =
      response.status === 204
        ? (undefined as T)
        : ((await response.json()) as T);
    if (notification)
      notificationService.success(notification.success, notificationId);
    return result;
  } catch (error) {
    if (notification)
      notificationService.error(error, notification.error, notificationId);
    throw error;
  }
}

function sendRequest(path: string, init: RequestInit) {
  const bodyIsFormData = init.body instanceof FormData;

  return fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(bodyIsFormData ? {} : { "Content-Type": "application/json" }),
      ...(init.headers ?? {}),
    },
  });
}

function parseApiErrorMessage(body: string) {
  if (!body.trim()) return "";

  try {
    const parsed = JSON.parse(body) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return body;

    const message = (parsed as Record<string, unknown>).message;
    if (Array.isArray(message))
      return message
        .filter((item): item is string => typeof item === "string")
        .join("\n");
    if (typeof message === "string") return message;
  } catch {
    return body;
  }

  return body;
}

async function refreshAccessToken() {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    return response.ok;
  } catch {
    return false;
  }
}

function shouldAttemptAuthRefresh(path: string) {
  return (
    path !== "/auth/login" &&
    path !== "/auth/refresh" &&
    path !== "/auth/logout"
  );
}
