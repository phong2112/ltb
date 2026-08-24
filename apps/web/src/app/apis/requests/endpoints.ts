const AUTH_ENDPOINT = "/auth";
const PUBLIC_JOBS_ENDPOINT = "/jobs";
const APPLICATIONS_ENDPOINT = "/applications";
const ADMIN_JOBS_ENDPOINT = "/admin/jobs";
const ADMIN_CANDIDATES_ENDPOINT = "/admin/candidates";
const ADMIN_CANDIDATE_APPLICATIONS_ENDPOINT = `${ADMIN_CANDIDATES_ENDPOINT}/applications`;
const ADMIN_SOURCING_ENDPOINT = "/admin/sourcing";
const ADMIN_TALENT_POOL_ENDPOINT = "/admin/talent-pool";
const ADMIN_TEMPLATES_ENDPOINT = "/admin/templates";

/** Central API endpoint map so request modules do not repeat route strings. */
export const API_ENDPOINTS = {
  auth: {
    me: `${AUTH_ENDPOINT}/me`,
    login: `${AUTH_ENDPOINT}/login`,
    refresh: `${AUTH_ENDPOINT}/refresh`,
    logout: `${AUTH_ENDPOINT}/logout`,
  },
  jobs: {
    publicList: `${PUBLIC_JOBS_ENDPOINT}/public`,
    adminList: ADMIN_JOBS_ENDPOINT,
    adminDetail: (id: string) => `${ADMIN_JOBS_ENDPOINT}/${encodeURIComponent(id)}`,
  },
  applications: {
    cvPreview: `${APPLICATIONS_ENDPOINT}/cv-preview`,
    submit: APPLICATIONS_ENDPOINT,
  },
  candidates: {
    adminList: (query: string) => `${ADMIN_CANDIDATES_ENDPOINT}${query}`,
    candidate: (id: string) => `${ADMIN_CANDIDATES_ENDPOINT}/${encodeURIComponent(id)}`,
    application: (applicationId: string) => `${ADMIN_CANDIDATE_APPLICATIONS_ENDPOINT}/${encodeURIComponent(applicationId)}`,
    applicationAnalysis: (applicationId: string) => `${API_ENDPOINTS.candidates.application(applicationId)}/analysis`,
    applicationRetry: (applicationId: string) => `${API_ENDPOINTS.candidates.application(applicationId)}/ai/retry`,
    applicationMessages: (applicationId: string) => `${API_ENDPOINTS.candidates.application(applicationId)}/messages`,
    cvExports: `${ADMIN_CANDIDATES_ENDPOINT}/cv-exports`,
  },
  sourcing: {
    campaigns: ADMIN_SOURCING_ENDPOINT,
    campaign: (campaignId: string) => `${ADMIN_SOURCING_ENDPOINT}/${encodeURIComponent(campaignId)}`,
    campaignStatus: (campaignId: string) => `${API_ENDPOINTS.sourcing.campaign(campaignId)}/status`,
    run: (campaignId: string) => `${API_ENDPOINTS.sourcing.campaign(campaignId)}/run`,
    profiles: (campaignId: string) => `${API_ENDPOINTS.sourcing.campaign(campaignId)}/profiles`,
    linkedinDiscovery: (campaignId: string) => `${API_ENDPOINTS.sourcing.campaign(campaignId)}/discover/linkedin`,
    internalSuggestions: (campaignId: string) => `${API_ENDPOINTS.sourcing.campaign(campaignId)}/suggest/internal`,
    profileStatus: (campaignId: string, profileId: string) =>
      `${API_ENDPOINTS.sourcing.profiles(campaignId)}/${encodeURIComponent(profileId)}/status`,
    profileFeedback: (campaignId: string, profileId: string) =>
      `${API_ENDPOINTS.sourcing.profiles(campaignId)}/${encodeURIComponent(profileId)}/feedback`,
  },
  talentPool: {
    list: ADMIN_TALENT_POOL_ENDPOINT,
    upload: `${ADMIN_TALENT_POOL_ENDPOINT}/upload`,
    entry: (id: string) => `${ADMIN_TALENT_POOL_ENDPOINT}/${encodeURIComponent(id)}`,
    promote: (id: string) => `${API_ENDPOINTS.talentPool.entry(id)}/promote`,
    aiRetry: (id: string) => API_ENDPOINTS.talentPool.entry(id) + "/ai/retry",
  },
  templates: {
    list: ADMIN_TEMPLATES_ENDPOINT,
    detail: (templateId: string) => `${ADMIN_TEMPLATES_ENDPOINT}/${encodeURIComponent(templateId)}`,
  },
} as const;
