import { API_ROUTES, apiPath } from "@hr-copilot/shared";

const AUTH_ENDPOINT = apiPath(API_ROUTES.auth.base);
const APPLICATIONS_ENDPOINT = apiPath(API_ROUTES.applications.base);
const CHAT_ENDPOINT = apiPath(API_ROUTES.chat.base);
const ADMIN_CHAT_ENDPOINT = apiPath(API_ROUTES.adminChat.base);
const JOBS_ENDPOINT = apiPath(API_ROUTES.jobs.base);
const ADMIN_CANDIDATES_ENDPOINT = apiPath(API_ROUTES.candidates.base);
const ADMIN_CANDIDATE_APPLICATIONS_ENDPOINT = apiPath(API_ROUTES.candidates.base, API_ROUTES.candidates.applications);
const ADMIN_SOURCING_ENDPOINT = apiPath(API_ROUTES.sourcing.base);
const ADMIN_TALENT_POOL_ENDPOINT = apiPath(API_ROUTES.talentPool.base);
const ADMIN_TEMPLATES_ENDPOINT = apiPath(API_ROUTES.templates.base);
const ADMIN_ANALYTICS_ENDPOINT = apiPath(API_ROUTES.analytics.admin);

/** Central API endpoint map so request modules do not repeat route strings. */
export const API_ENDPOINTS = {
  auth: {
    me: apiPath(AUTH_ENDPOINT, API_ROUTES.auth.me),
    login: apiPath(AUTH_ENDPOINT, API_ROUTES.auth.login),
    refresh: apiPath(AUTH_ENDPOINT, API_ROUTES.auth.refresh),
    logout: apiPath(AUTH_ENDPOINT, API_ROUTES.auth.logout),
  },
  jobs: {
    base: JOBS_ENDPOINT,
    publicList: JOBS_ENDPOINT,
    adminList: `${JOBS_ENDPOINT}?scope=${API_ROUTES.jobs.adminScope}`,
    detail: (id: string) => apiPath(JOBS_ENDPOINT, encodeURIComponent(id)),
  },
  applications: {
    cvPreview: apiPath(APPLICATIONS_ENDPOINT, API_ROUTES.applications.cvPreview),
    submit: APPLICATIONS_ENDPOINT,
  },
  chat: {
    session: apiPath(CHAT_ENDPOINT, API_ROUTES.chat.session),
    restore: apiPath(CHAT_ENDPOINT, API_ROUTES.chat.restore),
    reset: apiPath(CHAT_ENDPOINT, API_ROUTES.chat.reset),
    realtimeTicket: apiPath(CHAT_ENDPOINT, API_ROUTES.chat.realtimeTicket),
    conversation: apiPath(CHAT_ENDPOINT, API_ROUTES.chat.conversation),
    messages: apiPath(CHAT_ENDPOINT, API_ROUTES.chat.messages),
    read: apiPath(CHAT_ENDPOINT, API_ROUTES.chat.read),
  },
  adminChat: {
    realtimeTicket: apiPath(ADMIN_CHAT_ENDPOINT, API_ROUTES.adminChat.realtimeTicket),
    unreadSummary: apiPath(ADMIN_CHAT_ENDPOINT, API_ROUTES.adminChat.unreadSummary),
    conversations: apiPath(ADMIN_CHAT_ENDPOINT, API_ROUTES.adminChat.conversations),
    conversation: (id: string) => apiPath(ADMIN_CHAT_ENDPOINT, API_ROUTES.adminChat.conversations, encodeURIComponent(id)),
    messages: (id: string) => apiPath(API_ENDPOINTS.adminChat.conversation(id), API_ROUTES.adminChat.messages),
    read: (id: string) => apiPath(API_ENDPOINTS.adminChat.conversation(id), API_ROUTES.adminChat.read),
    status: (id: string) => apiPath(API_ENDPOINTS.adminChat.conversation(id), API_ROUTES.adminChat.status),
  },
  candidates: {
    adminList: (query: string) => `${ADMIN_CANDIDATES_ENDPOINT}${query}`,
    candidate: (id: string) => apiPath(ADMIN_CANDIDATES_ENDPOINT, encodeURIComponent(id)),
    application: (applicationId: string) => apiPath(ADMIN_CANDIDATE_APPLICATIONS_ENDPOINT, encodeURIComponent(applicationId)),
    applicationAnalysis: (applicationId: string) => apiPath(API_ENDPOINTS.candidates.application(applicationId), API_ROUTES.candidates.analysis),
    applicationRetry: (applicationId: string) => apiPath(API_ENDPOINTS.candidates.application(applicationId), API_ROUTES.candidates.aiRetry),
    cvExports: apiPath(ADMIN_CANDIDATES_ENDPOINT, API_ROUTES.candidates.cvExports),
  },
  sourcing: {
    campaigns: ADMIN_SOURCING_ENDPOINT,
    campaign: (campaignId: string) => apiPath(ADMIN_SOURCING_ENDPOINT, encodeURIComponent(campaignId)),
    campaignStatus: (campaignId: string) => apiPath(API_ENDPOINTS.sourcing.campaign(campaignId), API_ROUTES.sourcing.status),
    run: (campaignId: string) => apiPath(API_ENDPOINTS.sourcing.campaign(campaignId), API_ROUTES.sourcing.run),
    profiles: (campaignId: string) => apiPath(API_ENDPOINTS.sourcing.campaign(campaignId), API_ROUTES.sourcing.profiles),
    linkedinDiscovery: (campaignId: string) => apiPath(API_ENDPOINTS.sourcing.campaign(campaignId), API_ROUTES.sourcing.discoverLinkedin),
    internalSuggestions: (campaignId: string) => apiPath(API_ENDPOINTS.sourcing.campaign(campaignId), API_ROUTES.sourcing.suggestInternal),
    profileStatus: (campaignId: string, profileId: string) =>
      apiPath(API_ENDPOINTS.sourcing.profiles(campaignId), encodeURIComponent(profileId), API_ROUTES.sourcing.status),
    profileFeedback: (campaignId: string, profileId: string) =>
      apiPath(API_ENDPOINTS.sourcing.profiles(campaignId), encodeURIComponent(profileId), API_ROUTES.sourcing.feedback),
  },
  talentPool: {
    list: ADMIN_TALENT_POOL_ENDPOINT,
    upload: apiPath(ADMIN_TALENT_POOL_ENDPOINT, API_ROUTES.talentPool.upload),
    entry: (id: string) => apiPath(ADMIN_TALENT_POOL_ENDPOINT, encodeURIComponent(id)),
    promote: (id: string) => apiPath(API_ENDPOINTS.talentPool.entry(id), API_ROUTES.talentPool.promote),
    aiRetry: (id: string) => apiPath(API_ENDPOINTS.talentPool.entry(id), API_ROUTES.talentPool.aiRetry),
  },
  analytics: {
    eventsBatch: apiPath(API_ROUTES.analytics.events, API_ROUTES.analytics.eventsBatch),
    overview: apiPath(ADMIN_ANALYTICS_ENDPOINT, API_ROUTES.analytics.overview),
    features: apiPath(ADMIN_ANALYTICS_ENDPOINT, API_ROUTES.analytics.features),
    issues: apiPath(ADMIN_ANALYTICS_ENDPOINT, API_ROUTES.analytics.issues),
    funnel: apiPath(ADMIN_ANALYTICS_ENDPOINT, API_ROUTES.analytics.applicationFunnel),
    events: apiPath(ADMIN_ANALYTICS_ENDPOINT, API_ROUTES.analytics.events),
  },
  templates: {
    list: ADMIN_TEMPLATES_ENDPOINT,
    detail: (templateId: string) => apiPath(ADMIN_TEMPLATES_ENDPOINT, encodeURIComponent(templateId)),
  },
} as const;
