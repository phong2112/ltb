export const applicationStatuses = [
  "NEW",
  "REVIEWING",
  "CONTACTED",
  "REPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "TALENT_POOL",
] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];
