import type { CandidateStatus } from "@/app/data";
import { CANDIDATE_WORKFLOW_STATUSES } from "@/app/utils/configs/status-config";

export const ITEMS_PER_PAGE = 10;
export const TALENT_POOL_FETCH_SIZE = 100;

export const TALENT_POOL_STATUS: CandidateStatus = "talent_pool";
export const BULK_UPLOAD_MODE = "bulk";
export const PER_FILE_UPLOAD_MODE = "per-file";
export const SORT_NEWEST = "newest";
export const SORT_OLDEST = "oldest";
export const SORT_NAME_ASC = "name-asc";

export const STATUS_OPTS: (CandidateStatus | "all")[] = [
  "all",
  ...CANDIDATE_WORKFLOW_STATUSES,
  TALENT_POOL_STATUS,
];

