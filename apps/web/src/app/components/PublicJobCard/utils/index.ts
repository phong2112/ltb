/** Builds a public jobs URL that focuses one job while preserving current filters/search params. */
export function buildFocusedJobsPath(jobId: string, currentSearch: string) {
  const params = new URLSearchParams(currentSearch);
  params.set("job", jobId);
  const search = params.toString();
  return `/jobs${search ? `?${search}` : ""}`;
}
