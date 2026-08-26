import type { AnalyticsFeatureRow, AnalyticsFunnelRow, AnalyticsIssueRow, AnalyticsOverview, AnalyticsRecentEvent } from "@hr-copilot/shared";
import { apiRequest } from "./client";
import { API_ENDPOINTS } from "./endpoints";

export type AnalyticsFilters = { from: string; to: string; actorType?: "public" | "admin"; feature?: string };
function query(filters: AnalyticsFilters) {
  const params = new URLSearchParams({ from: filters.from, to: filters.to });
  if (filters.actorType) params.set("actorType", filters.actorType);
  if (filters.feature) params.set("feature", filters.feature);
  return params.toString();
}
export const getAnalyticsOverview = (filters: AnalyticsFilters) => apiRequest<AnalyticsOverview>(`${API_ENDPOINTS.analytics.overview}?${query(filters)}`);
export const getAnalyticsFeatures = (filters: AnalyticsFilters) => apiRequest<AnalyticsFeatureRow[]>(`${API_ENDPOINTS.analytics.features}?${query(filters)}`);
export const getAnalyticsIssues = (filters: AnalyticsFilters) => apiRequest<AnalyticsIssueRow[]>(`${API_ENDPOINTS.analytics.issues}?${query(filters)}`);
export const getApplicationFunnel = (filters: AnalyticsFilters) => apiRequest<AnalyticsFunnelRow[]>(`${API_ENDPOINTS.analytics.funnel}?${query(filters)}`);
export const getAnalyticsEvents = (filters: AnalyticsFilters) => apiRequest<AnalyticsRecentEvent[]>(`${API_ENDPOINTS.analytics.events}?${query(filters)}&limit=30`);
