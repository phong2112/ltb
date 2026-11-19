export const CHAT_KNOWLEDGE_CATEGORIES = [
  "ABOUT_TA",
  "COMPANY_POLICY",
  "BENEFITS",
  "RECRUITMENT_PROCESS",
  "FAQ",
  "OTHER",
] as const;

export type ChatKnowledgeCategory = (typeof CHAT_KNOWLEDGE_CATEGORIES)[number];

export const CHAT_KNOWLEDGE_TITLE_MAX_LENGTH = 200;
export const CHAT_KNOWLEDGE_CONTENT_MAX_LENGTH = 4000;
