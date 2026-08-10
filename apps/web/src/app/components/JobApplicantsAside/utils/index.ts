import type { Candidate } from "@/app/data";

/** Returns candidates for one job with newest applications first. */
export function getSortedJobCandidates(candidates: Candidate[], jobId: string) {
  return candidates
    .filter((candidate) => candidate.jobId === jobId)
    .sort((left, right) => right.appliedAtIso.localeCompare(left.appliedAtIso));
}

/** Filters the applicant list by visible contact fields used in the aside search box. */
export function filterApplicants(candidates: Candidate[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return candidates;

  return candidates.filter((candidate) =>
    candidate.name.toLowerCase().includes(query)
    || candidate.email.toLowerCase().includes(query)
    || candidate.phone.toLowerCase().includes(query),
  );
}

/** Computes pagination state and the visible slice for the applicant aside. */
export function paginateApplicants(candidates: Candidate[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(candidates.length / pageSize));
  const activePage = Math.min(page, totalPages);
  const pageStart = (activePage - 1) * pageSize;

  return {
    activePage,
    totalPages,
    visibleCandidates: candidates.slice(pageStart, pageStart + pageSize),
  };
}
