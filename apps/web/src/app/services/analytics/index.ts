import type { ProductEventInput, ProductEventName } from "@hr-copilot/shared";
import { API_BASE } from "@/app/apis/requests/client";

const SESSION_KEY = "hr_product_analytics_session";
const MAX_QUEUE = 100;
const BATCH_SIZE = 20;
const FLUSH_INTERVAL_MS = 5_000;
let queue: ProductEventInput[] = [];
let flushTimer: number | undefined;
let flushing = false;

export type TrackInput = Omit<ProductEventInput, "eventId" | "occurredAt" | "anonymousSessionId" | "schemaVersion">;

export function track(eventName: ProductEventName, input: Omit<TrackInput, "eventName"> = {}) {
  if (!analyticsEnabled() || typeof window === "undefined") return;
  queue.push({
    ...input,
    eventId: createId(),
    schemaVersion: 1,
    eventName,
    occurredAt: new Date().toISOString(),
    anonymousSessionId: getSessionId(),
    release: input.release ?? import.meta.env.VITE_APP_RELEASE,
  });
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  if (queue.length >= BATCH_SIZE) void flush();
  else scheduleFlush();
}

export async function flush(options: { keepalive?: boolean } = {}) {
  if (!analyticsEnabled() || flushing || queue.length === 0) return;
  flushing = true;
  if (flushTimer) window.clearTimeout(flushTimer);
  flushTimer = undefined;
  const events = queue.splice(0, BATCH_SIZE);
  try {
    const response = await fetch(`${API_BASE}/analytics/events/batch`, {
      method: "POST",
      credentials: "include",
      keepalive: options.keepalive,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
    });
    if (!response.ok && response.status >= 500) queue = [...events, ...queue].slice(0, MAX_QUEUE);
  } catch {
    queue = [...events, ...queue].slice(0, MAX_QUEUE);
  } finally {
    flushing = false;
    if (queue.length) scheduleFlush();
  }
}

export function installAnalyticsLifecycle() {
  if (!analyticsEnabled() || typeof window === "undefined") return () => undefined;
  const onVisibility = () => { if (document.visibilityState === "hidden") void flush({ keepalive: true }); };
  const onError = () => track("client_error_occurred", { errorCode: "window_error", routeTemplate: routeTemplateFor(window.location.pathname) });
  const onRejection = () => track("client_error_occurred", { errorCode: "unhandled_rejection", routeTemplate: routeTemplateFor(window.location.pathname) });
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}

export function routeTemplateFor(pathname: string) {
  const path = pathname.replace(/^\/t\/[^/]+/, "/t/:tenantSlug") || "/";
  return path
    .replace(/^(\/t\/:tenantSlug)?\/jobs\/[^/]+\/apply$/, "$1/jobs/:id/apply")
    .replace(/^(\/t\/:tenantSlug)?\/jobs\/[^/]+$/, "$1/jobs/:id")
    .replace(/^\/admin\/(jobs|candidates|talent-pool|sourcing)\/[^/]+(\/edit)?$/, "/admin/$1/:id$2");
}

function scheduleFlush() {
  if (flushTimer || typeof window === "undefined") return;
  flushTimer = window.setTimeout(() => void flush(), FLUSH_INTERVAL_MS);
}
function getSessionId() {
  try {
    const current = window.sessionStorage.getItem(SESSION_KEY);
    if (current) return current;
    const created = createId();
    window.sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch { return undefined; }
}
function createId() { return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; }
function analyticsEnabled() { return import.meta.env.VITE_ANALYTICS_ENABLED === "true"; }
