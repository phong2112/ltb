export const JOB_STATUS_CONFIG = {
  published: {
    badgeClass: "border-emerald-200 bg-emerald-100 text-emerald-700",
  },
  draft: { badgeClass: "border-gray-200 bg-gray-100 text-gray-600" },
  closed: { badgeClass: "border-amber-200 bg-amber-100 text-amber-700" },
  archived: { badgeClass: "border-slate-200 bg-slate-100 text-slate-600" },
} as const;

export type JobStatus = keyof typeof JOB_STATUS_CONFIG;

export const CANDIDATE_STATUS_CONFIG = {
  new: { badgeClass: "border-blue-200 bg-blue-100 text-blue-700" },
  reviewing: { badgeClass: "border-amber-200 bg-amber-100 text-amber-700" },
  contacted: { badgeClass: "border-cyan-200 bg-cyan-100 text-cyan-700" },
  replied: { badgeClass: "border-sky-200 bg-sky-100 text-sky-700" },
  screening: { badgeClass: "border-indigo-200 bg-indigo-100 text-indigo-700" },
  interview: { badgeClass: "border-purple-200 bg-purple-100 text-purple-700" },
  offer: { badgeClass: "border-emerald-200 bg-emerald-100 text-emerald-700" },
  rejected: { badgeClass: "border-red-200 bg-red-100 text-red-600" },
  talent_pool: { badgeClass: "border-slate-200 bg-slate-100 text-slate-700" },
} as const;

export type CandidateStatus = keyof typeof CANDIDATE_STATUS_CONFIG;
export const CANDIDATE_STATUSES = Object.keys(
  CANDIDATE_STATUS_CONFIG,
) as CandidateStatus[];
export const CANDIDATE_WORKFLOW_STATUSES = [
  "new",
  "contacted",
  "interview",
  "offer",
  "rejected",
] as const satisfies CandidateStatus[];

export const URGENT_BADGE_CLASS = "border-rose-200 bg-rose-100 text-rose-600";
