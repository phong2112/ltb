export const PRODUCT_EVENT_NAMES = [
  "page_viewed", "feature_action_started", "feature_action_completed", "feature_action_failed",
  "form_validation_failed", "client_error_occurred", "application_funnel_step", "search_performed",
] as const;
export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

export const ANALYTICS_FEATURES = [
  "jobs", "job_detail", "application", "candidate_inbox", "candidate_detail", "cv_preview",
  "cv_export", "ai_analysis", "follow_up", "templates", "sourcing", "chat", "settings", "auth",
] as const;
export type AnalyticsFeature = (typeof ANALYTICS_FEATURES)[number];
export type AnalyticsActorType = "public" | "admin";
export type AnalyticsOutcome = "success" | "failure" | "neutral";

export const APPLICATION_FUNNEL_STEPS = [
  "job_viewed", "apply_started", "cv_selected", "submit_attempted", "submitted",
] as const;
export type ApplicationFunnelStep = (typeof APPLICATION_FUNNEL_STEPS)[number];

export type AnalyticsProperties = {
  audience?: AnalyticsActorType;
  referrerType?: "internal" | "external" | "none";
  durationBucket?: "lt_250ms" | "250_999ms" | "1_3s" | "gt_3s";
  entityType?: "job" | "application" | "candidate" | "file" | "campaign" | "message";
  formId?: string;
  fieldCodes?: string[];
  errorCodes?: string[];
  step?: ApplicationFunnelStep;
  filterKeys?: string[];
  hasQuery?: boolean;
};

export type ProductEventInput = {
  eventId: string; schemaVersion?: 1; eventName: ProductEventName; occurredAt: string;
  anonymousSessionId?: string; feature?: AnalyticsFeature; action?: string; surface?: string;
  routeTemplate?: string; errorCode?: string; httpStatus?: number; durationMs?: number;
  requestId?: string; release?: string; properties?: AnalyticsProperties;
};

export type AnalyticsOverview = { from: string; to: string; sessions: number; completedActions: number; failedEvents: number; errorRate: number; activeFeatures: number };
export type AnalyticsFeatureRow = { feature: string; completedActions: number; sessions: number; previousCompletedActions: number; trendPercent: number | null };
export type AnalyticsIssueRow = { errorCode: string; feature: string; action: string; count: number; sessions: number; lastOccurredAt: string };
export type AnalyticsFunnelRow = { step: ApplicationFunnelStep; count: number; sessions: number; conversionFromPrevious: number | null };
export type AnalyticsRecentEvent = { id: string; eventName: ProductEventName; actorType: AnalyticsActorType; feature: string | null; action: string | null; outcome: AnalyticsOutcome; errorCode: string | null; occurredAt: string };
