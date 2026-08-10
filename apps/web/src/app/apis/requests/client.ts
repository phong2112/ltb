import {
  notificationService,
  type ActionNotification,
} from "@/app/services/notification.service";
import { currentTenantSlug } from "@/app/utils/tenant";
import { API_ENDPOINTS } from "./endpoints";

export const API_BASE = resolveApiBase(
  import.meta.env.VITE_API_BASE_PATH as string | undefined,
);

/** Auth endpoints that should not recursively trigger refresh attempts on 401 responses. */
const AUTH_SKIP_REFRESH_ENDPOINTS = new Set<string>([
  API_ENDPOINTS.auth.login,
  API_ENDPOINTS.auth.refresh,
  API_ENDPOINTS.auth.logout,
]);

type ApiRequestInit = RequestInit & {
  skipAuthRefresh?: boolean;
  notification?: ActionNotification;
};

/** Error type thrown for non-2xx API responses with the HTTP status preserved. */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Shared request wrapper for API calls, auth refresh, JSON parsing, and action notifications. */
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

/** Sends one fetch request with tenant and JSON headers applied consistently. */
function sendRequest(path: string, init: RequestInit) {
  const bodyIsFormData = init.body instanceof FormData;

  return fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(bodyIsFormData ? {} : { "Content-Type": "application/json" }),
      "X-Tenant-Slug": currentTenantSlug(),
      ...(init.headers ?? {}),
    },
  });
}

/** Extracts a readable API error message from Nest validation/error response bodies. */
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

/** Attempts to refresh the access token using the existing auth cookie. */
async function refreshAccessToken() {
  try {
    const response = await fetch(`${API_BASE}${API_ENDPOINTS.auth.refresh}`, {
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
function shouldAttemptAuthRefresh(path: string) {
  return !AUTH_SKIP_REFRESH_ENDPOINTS.has(path);
}

/** Resolves the API origin/path and keeps Vercel deployments on same-origin API routes. */
function resolveApiBase(configuredBase: string | undefined) {
  const normalizedBase = (configuredBase || "/api").replace(/\/$/, "");
  if (typeof window === "undefined") return normalizedBase;

  // Keep admin auth cookies first-party on Vercel; direct Render calls are
  // treated as third-party cookies by fresh/incognito browser sessions.
  if (
    window.location.hostname.endsWith(".vercel.app") &&
    isAbsoluteUrl(normalizedBase)
  ) {
    return "/api";
  }

  return normalizedBase;
}

/** Distinguishes configured absolute API URLs from same-origin API base paths. */
function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}
