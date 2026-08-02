export function buildFocusedJobsPath(jobId: string, currentSearch: string) {
  const params = new URLSearchParams(currentSearch);
  params.set("job", jobId);
  const search = params.toString();
  return `/jobs${search ? `?${search}` : ""}`;
}

