import type { MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ChevronRight, Clock, Heart, MapPin, Users } from "lucide-react";
import type { Job } from "@/app/data";
import { translateJobLevel, translateJobType, useLanguage } from "@/app/i18n";
import { URGENT_BADGE_CLASS } from "@/app/status-config";

type PublicJobCardProps = {
  job: Job;
  active?: boolean;
  onSelect?: (jobId: string) => void;
  showRemoveSaved?: boolean;
  onRemoveSaved?: (jobId: string) => void;
};

export default function PublicJobCard({
  job,
  active = false,
  onSelect,
  showRemoveSaved = false,
  onRemoveSaved,
}: PublicJobCardProps) {
  const { language, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const focusedJobsPath = buildFocusedJobsPath(job.id, location.pathname === "/jobs" ? location.search : "");
  const detailPath = `/jobs/${encodeURIComponent(job.id)}?from=${encodeURIComponent(focusedJobsPath)}`;

  function selectJob() {
    if (onSelect) {
      onSelect(job.id);
      return;
    }

    // Keep the jobs list immediately behind detail in browser history, even
    // when candidates enter from a featured job card on the home page.
    navigate(focusedJobsPath, { replace: true });
    navigate(detailPath);
  }

  function openDetails(event: MouseEvent<HTMLAnchorElement>) {
    event.stopPropagation();
    event.preventDefault();
    navigate(focusedJobsPath, { replace: true });
    navigate(detailPath);
  }

  return (
    <article
      id={onSelect ? `job-card-${job.id}` : undefined}
      role="button"
      tabIndex={0}
      onClick={selectJob}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectJob();
        }
      }}
      aria-current={active ? "true" : undefined}
      aria-label={`${t("common.viewDetails")}: ${job.title}`}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-white p-4 text-left shadow-sm outline-none transition-all duration-200 active:scale-[0.99] focus:border-primary focus:bg-pink-50/40 focus:shadow-md focus:ring-2 focus:ring-primary/20 lg:min-h-48 ${active ? "lg:border-primary lg:bg-pink-50/40 lg:shadow-md lg:ring-1 lg:ring-primary/15" : "hover:border-primary/60 hover:shadow-md"}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-12 flex-none items-center justify-center rounded-xl border border-pink-100 bg-pink-50 text-2xl sm:rounded-2xl">
          {job.logo}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-base font-black leading-snug text-foreground transition-colors group-hover:text-primary">
            {job.title}
          </h3>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-xs font-semibold text-muted-foreground">{job.company}</p>
            {job.urgent && (
              <span className={`inline-flex flex-none rounded-full border px-2 py-0.5 text-[10px] font-bold ${URGENT_BADGE_CLASS}`}>
                🔥 {t("jobs.urgent")}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex min-h-6 flex-wrap content-start gap-1.5">
        <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground">
          {translateJobType(job.type, language)}
        </span>
        <span className="rounded-full border border-border bg-white px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
          {translateJobLevel(job.level, language)}
        </span>
        {job.tags.slice(0, 1).map(tag => (
          <span key={tag} className="max-w-32 truncate rounded-full bg-pink-50 px-2.5 py-1 text-[10px] font-semibold text-primary">
            {tag}
          </span>
        ))}
        {job.tags.length > 1 && <span className="px-1 py-1 text-[10px] font-bold text-muted-foreground">+{job.tags.length - 1}</span>}
      </div>

      <div className="mt-auto pt-3.5">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1">
            <MapPin size={12} className="flex-none text-primary" />
            <span className="truncate">{job.location}</span>
          </span>
          <span className="ml-auto max-w-[52%] truncate font-extrabold text-amber-700">💰 {job.salary || t("jobs.salaryNegotiable")}</span>
        </div>

        <div className="mt-3 flex min-h-8 items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <span className="hidden items-center gap-1 sm:flex"><Users size={11} />{job.applicants} {t("common.candidates")}</span>
          {job.posted && <span className="flex flex-none items-center gap-1"><Clock size={11} />{job.posted}</span>}
          {showRemoveSaved && onRemoveSaved && (
            <button
              type="button"
              onClick={event => {
                event.stopPropagation();
                onRemoveSaved(job.id);
              }}
              title={t("savedJobs.remove")}
              aria-label={t("savedJobs.remove")}
              className="inline-flex flex-none cursor-pointer items-center text-primary transition-all hover:scale-110 hover:text-primary/70 active:scale-95"
            >
              <Heart size={13} fill="currentColor" />
            </button>
          )}
          <Link
            to={detailPath}
            onClick={openDetails}
            className="ml-auto inline-flex flex-none items-center gap-0.5 text-xs font-bold text-primary transition-all hover:gap-1.5 hover:underline"
          >
            {t("common.viewDetails")} <ChevronRight size={12} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function buildFocusedJobsPath(jobId: string, currentSearch: string) {
  const params = new URLSearchParams(currentSearch);
  params.set("job", jobId);
  const search = params.toString();
  return `/jobs${search ? `?${search}` : ""}`;
}
