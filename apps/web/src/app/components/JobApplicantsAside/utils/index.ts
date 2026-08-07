import type { Candidate } from "@/app/data";

export function getSortedJobCandidates(candidates: Candidate[], jobId: string) {
  return candidates
    .filter((candidate) => candidate.jobId === jobId)
    .sort((left, right) => right.appliedAtIso.localeCompare(left.appliedAtIso));
}

export function filterApplicants(candidates: Candidate[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return candidates;

  return candidates.filter((candidate) =>
    candidate.name.toLowerCase().includes(query)
    || candidate.email.toLowerCase().includes(query)
    || candidate.phone.toLowerCase().includes(query),
  );
}

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
