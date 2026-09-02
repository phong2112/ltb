/** Canonical API route segments shared by NestJS and browser request modules. */
export const API_ROUTES = {
  health: "health",
  auth: { base: "auth", login: "login", refresh: "refresh", logout: "logout", me: "me" },
  jobs: { base: "jobs", adminScope: "admin", id: ":id" },
  applications: { base: "applications", cvPreview: "cv-preview" },
  chat: {
    base: "chat", session: "session", restore: "session/restore", reset: "session/reset", realtimeTicket: "realtime-ticket",
    conversation: "conversation", messages: "messages", read: "read",
  },
  adminChat: {
    base: "admin/chat", realtimeTicket: "realtime-ticket", conversations: "conversations", unreadSummary: "unread-summary",
    messages: "messages", read: "read", status: "status", id: ":id",
  },
  candidates: {
    base: "admin/candidates", cvExports: "cv-exports", files: "files", applications: "applications", analysis: "analysis",
    aiRetry: "ai/retry", id: ":id", applicationId: ":applicationId", fileId: ":fileId",
  },
  talentPool: { base: "admin/talent-pool", upload: "upload", aiRetry: "ai/retry", promote: "promote", id: ":id" },
  sourcing: {
    base: "admin/sourcing", status: "status", discoverLinkedin: "discover/linkedin", run: "run", suggestInternal: "suggest/internal",
    profiles: "profiles", feedback: "feedback", id: ":id", profileId: ":profileId",
  },
  templates: { base: "admin/templates", id: ":id" },
  analytics: {
    base: "analytics", events: "analytics/events", eventsBatch: "batch", admin: "admin/analytics", overview: "overview", features: "features",
    issues: "issues", applicationFunnel: "funnels/application", maintenance: "maintenance",
  },
} as const;

export function apiPath(...segments: string[]) {
  return `/${segments.filter(Boolean).map(segment => segment.replace(/^\/+|\/+$/g, "")).join("/")}`;
}
