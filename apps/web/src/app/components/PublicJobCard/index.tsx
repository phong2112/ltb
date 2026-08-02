import type { MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { useLanguage } from "@/app/services/i18n-service";
import { JobFooter, JobHeader, JobTags } from "./components";
import type { PublicJobCardProps } from "./types";
import { buildFocusedJobsPath } from "./utils";

export default function PublicJobCard({
  job,
  active = false,
  onSelect,
  showRemoveSaved = false,
  onRemoveSaved,
  expandedContent,
}: PublicJobCardProps) {
  const { language, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const interactive = Boolean(onSelect);
  const focusedJobsPath = buildFocusedJobsPath(job.id, location.pathname === "/jobs" ? location.search : "");
  const detailPath = `/jobs/${encodeURIComponent(job.id)}?from=${encodeURIComponent(focusedJobsPath)}`;

  function selectJob() {
    onSelect?.(job.id);
  }

  function openDetails(event: MouseEvent<HTMLAnchorElement>) {
    event.stopPropagation();
    if (!interactive) return;

    event.preventDefault();
    navigate(focusedJobsPath, { replace: true });
    navigate(detailPath);
  }

  return (
    <article
      id={interactive ? `job-card-${job.id}` : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? selectJob : undefined}
      onKeyDown={interactive ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectJob();
        }
      } : undefined}
      aria-current={active ? "true" : undefined}
      className={`group relative flex min-h-48 flex-col overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-sm outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/35 ${interactive ? "cursor-pointer active:scale-[0.99]" : "h-full"} ${active ? "border-primary bg-pink-50/40 shadow-md ring-1 ring-primary/15" : "border-border hover:border-primary/60 hover:shadow-md"}`}
    >
      <JobHeader interactive={interactive} job={job} urgentLabel={t("jobs.urgent")} />
      <JobTags job={job} language={language} />
      <JobFooter
        detailPath={detailPath}
        interactive={interactive}
        job={job}
        posted={job.posted}
        removeSavedLabel={t("savedJobs.remove")}
        salaryLabel={t("jobs.salaryNegotiable")}
        showRemoveSaved={showRemoveSaved}
        viewDetailsLabel={t("common.viewDetails")}
        onDetailsClick={openDetails}
        onRemoveSaved={onRemoveSaved ? () => onRemoveSaved(job.id) : undefined}
      />
      {expandedContent && (
        <div
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {expandedContent}
        </div>
      )}
    </article>
  );
}

