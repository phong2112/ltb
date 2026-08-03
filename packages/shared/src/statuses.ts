export const jobStatuses = ["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"] as const;
export type JobStatus = (typeof jobStatuses)[number];

export const applicationStatuses = [
  "NEW",
  "VIEWED",
  "CONTACTED",
  "REPLIED",
  "INTERVIEW",
  "OFFER",
  "OFFER_CLOSED",
  "REJECTED",
  "TALENT_POOL",
] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];

export const cvParseStatuses = [
  "PENDING",
  "EXTRACTING",
  "EXTRACTED",
  "ANALYZING",
  "COMPLETED",
  "FAILED",
] as const;
export type CvParseStatus = (typeof cvParseStatuses)[number];

export type TalentPoolStatus = CvParseStatus;

export const fileKinds = ["CV", "OTHER"] as const;
export type FileKind = (typeof fileKinds)[number];

export const fileStorageTiers = ["PRIMARY", "ARCHIVE"] as const;
export type FileStorageTier = (typeof fileStorageTiers)[number];
