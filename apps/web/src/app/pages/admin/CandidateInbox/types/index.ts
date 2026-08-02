import type { CandidateProfile, CandidateStatus } from "@/app/data";
import type { TalentPoolListItem } from "@/app/services/talent-pool-service";
import {
  BULK_UPLOAD_MODE,
  PER_FILE_UPLOAD_MODE,
  SORT_NAME_ASC,
  SORT_NEWEST,
  SORT_OLDEST,
} from "../constants";

export type UploadMode = typeof BULK_UPLOAD_MODE | typeof PER_FILE_UPLOAD_MODE;
export type SortOrder = typeof SORT_NEWEST | typeof SORT_OLDEST | typeof SORT_NAME_ASC;

export type UnifiedCandidateRow = {
  key: string;
  kind: "application" | "pool";
  name: string;
  email: string;
  title: string;
  date: string;
  sortTimestamp: number;
  status: CandidateStatus;
  applicationsCount: number;
  hasNew: boolean;
  href: string;
  candidate?: CandidateProfile;
  poolEntry?: TalentPoolListItem;
};

