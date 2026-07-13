import { Link } from "react-router";
import { ChevronRight, Clock, Heart, MapPin, Users } from "lucide-react";
import type { Job } from "@/app/data";
import { useLanguage } from "@/app/i18n";
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
  const { t } = useLanguage();
  const interactive = Boolean(onSelect);

  function selectJob() {
    onSelect?.(job.id);
  }

  return (
    <article
      id={interactive ? `job-card-${job.id}` : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? selectJob : undefined}
      onKeyDown={interactive ? event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectJob();
        }
      } : undefined}
      className={`group relative flex min-h-48 flex-col overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-sm outline-none transition-all duration-200 ${interactive ? "cursor-pointer active:scale-[0.99]" : "h-full"} ${active ? "border-primary bg-pink-50/40 shadow-md ring-1 ring-primary/15" : "border-border hover:border-primary/60 hover:shadow-md"}`}
    >
      {job.urgent && (
        <span className={`absolute right-4 top-4 rounded-full border px-2.5 py-1 text-[10px] font-bold ${URGENT_BADGE_CLASS}`}>
          🔥 {t("jobs.urgent")}
        </span>
      )}

      <div className="flex items-start gap-3">
        <div className="flex size-12 flex-none items-center justify-center rounded-2xl border border-pink-100 bg-pink-50 text-2xl">
          {job.logo}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={`line-clamp-2 text-base font-black leading-snug text-foreground transition-colors group-hover:text-primary ${job.urgent ? "pr-16" : ""}`} style={{ fontFamily: "'Playfair Display', serif" }}>
            {interactive ? (
              job.title
            ) : (
              <Link
                to={`/jobs?job=${encodeURIComponent(job.id)}`}
                className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {job.title}
              </Link>
            )}
          </h3>
          <p className="mt-0.5 truncate text-xs font-semibold text-muted-foreground">{job.company}</p>
        </div>
      </div>

      <div className="mt-4 flex min-h-6 flex-wrap content-start gap-1.5">
        {job.tags.slice(0, 3).map(tag => (
          <span key={tag} className="rounded-full bg-pink-50 px-2.5 py-1 text-[10px] font-semibold text-primary">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1">
            <MapPin size={11} className="flex-none" />
            <span className="truncate">{job.location}</span>
          </span>
          <span className="ml-auto truncate font-bold text-amber-600">💰 {job.salary || t("jobs.salaryNegotiable")}</span>
        </div>

        <div className="mt-3 flex min-h-7 items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Users size={11} />{job.applicants} {t("common.candidates")}</span>
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
            to={`/jobs/${job.id}`}
            onClick={event => event.stopPropagation()}
            className="ml-auto inline-flex flex-none items-center gap-0.5 text-xs font-bold text-primary transition-all hover:gap-1.5 hover:underline"
          >
            {t("common.viewDetails")} <ChevronRight size={12} />
          </Link>
        </div>
      </div>
    </article>
  );
}
