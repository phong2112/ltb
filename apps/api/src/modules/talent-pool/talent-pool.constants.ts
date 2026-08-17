/** Display name assigned to newly created talent pool candidates while CV processing is pending. */
export const TALENT_POOL_PENDING_NAME = "Ứng viên đang xử lý" as const;

/** Candidate source tag written to the `candidates` table for all talent pool uploads. */
export const TALENT_POOL_CANDIDATE_SOURCE = "talent_pool" as const;

/** Activity log action keys for talent pool lifecycle events. */
export const TALENT_POOL_ACTIVITY = {
  /** Recorded when a CV file is first uploaded and a pool entry is created. */
  UPLOADED: "talent_pool_uploaded",
} as const;
