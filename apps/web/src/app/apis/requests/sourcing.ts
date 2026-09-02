import type { ApiInternalCandidateSuggestionResult, ApiLinkedinDiscoveryResult, ApiSourcedProfile, ApiSourcingCampaign, ApiSourcingCampaignStatus, ApiSourcingDiscoveryLocationScope, ApiSourcingImportResult, ApiSourcingOrchestrationQueueResult, ApiSourcingProfileFeedback, ApiSourcingProfileStatus, ApiSourcingSource } from "@/app/apis/models/sourcing";
import { apiJsonRequest, apiRequest } from "./client";
import { API_ENDPOINTS } from "./endpoints";

/** Lists sourcing campaigns for the admin sourcing dashboard. */
export function listSourcingCampaigns() {
  return apiRequest<ApiSourcingCampaign[]>(API_ENDPOINTS.sourcing.campaigns);
}

/** Loads one sourcing campaign with its job, queries, and sourced profiles. */
export function getSourcingCampaign(id: string) {
  return apiRequest<ApiSourcingCampaign>(API_ENDPOINTS.sourcing.campaign(id));
}

/** Updates whether a sourcing campaign can run automatic discovery. */
export function updateSourcingCampaignStatus(campaignId: string, status: ApiSourcingCampaignStatus) {
  return apiJsonRequest<ApiSourcingCampaign, { status: ApiSourcingCampaignStatus }>(API_ENDPOINTS.sourcing.campaignStatus(campaignId), {
    method: "PATCH",
    body: { status },
  });
}

/** Creates a sourcing campaign from a target job and optional discovery scope. */
export function createSourcingCampaign(input: { jobId: string; name?: string; discoveryLocationScope?: ApiSourcingDiscoveryLocationScope }) {
  return apiJsonRequest<ApiSourcingCampaign, typeof input>(API_ENDPOINTS.sourcing.campaigns, {
    method: "POST",
    body: input,
  });
}

/** Imports pasted profile URLs into a campaign after API-side normalization and dedupe. */
export function importSourcingProfiles(campaignId: string, source: ApiSourcingSource, urls: string[]) {
  return apiJsonRequest<ApiSourcingImportResult, { source: ApiSourcingSource; urls: string[] }>(API_ENDPOINTS.sourcing.profiles(campaignId), {
    method: "POST",
    body: { source, urls },
  });
}

/** Runs assisted LinkedIn discovery for a campaign through the configured search provider. */
export function discoverLinkedinProfiles(campaignId: string) {
  return apiRequest<ApiLinkedinDiscoveryResult>(API_ENDPOINTS.sourcing.linkedinDiscovery(campaignId), {
    method: "POST",
  });
}

/** Queues AI-assisted query planning, internal retrieval, and public-web discovery. */
export function runSourcingOrchestration(campaignId: string) {
  return apiRequest<ApiSourcingOrchestrationQueueResult>(API_ENDPOINTS.sourcing.run(campaignId), {
    method: "POST",
  });
}

/** Suggests candidates already stored in the system for the campaign's target job. */
export function suggestInternalCandidates(campaignId: string) {
  return apiRequest<ApiInternalCandidateSuggestionResult>(API_ENDPOINTS.sourcing.internalSuggestions(campaignId), {
    method: "POST",
  });
}

/** Updates the funnel status for one sourced profile in a campaign. */
export function updateSourcingProfileStatus(
  campaignId: string,
  profileId: string,
  status: ApiSourcingProfileStatus,
) {
  return apiJsonRequest<ApiSourcedProfile, { status: ApiSourcingProfileStatus }>(API_ENDPOINTS.sourcing.profileStatus(campaignId, profileId), {
    method: "PATCH",
    body: { status },
  });
}

/** Records TA relevance feedback independently from the recruiting funnel status. */
export function updateSourcingProfileFeedback(
  campaignId: string,
  profileId: string,
  feedback: ApiSourcingProfileFeedback | null,
) {
  return apiJsonRequest<ApiSourcedProfile, { feedback: ApiSourcingProfileFeedback | null }>(API_ENDPOINTS.sourcing.profileFeedback(campaignId, profileId), {
    method: "PATCH",
    body: { feedback },
  });
}
