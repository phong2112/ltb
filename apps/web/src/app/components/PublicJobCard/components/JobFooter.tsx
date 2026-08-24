import { ChevronRight, Clock, Heart, MapPin } from "lucide-react";
import { Link } from "react-router";
import type { Job } from "@/app/data";
import type { JobCardActionsProps } from "@/app/components/PublicJobCard/types";

type JobFooterProps = JobCardActionsProps & {
  job: Job;
  salaryLabel: string;
  viewDetailsLabel: string;
  removeSavedLabel: string;
};

export function JobFooter({
  detailPath,
  interactive,
  job,
  posted,
  removeSavedLabel,
  salaryLabel,
  showRemoveSaved,
  viewDetailsLabel,
  onDetailsClick,
  onRemoveSaved,
}: JobFooterProps) {
  return (
    <div className="mt-auto pt-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1">
          <MapPin size={11} className="flex-none" />
          <span className="truncate">{job.location}</span>
        </span>
        <span className="ml-auto truncate font-bold text-amber-600">💰 {job.salary || salaryLabel}</span>
      </div>

      <div className="mt-3 flex min-h-7 items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
        {posted && <span className="flex flex-none items-center gap-1"><Clock size={11} />{posted}</span>}
        {showRemoveSaved && onRemoveSaved && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRemoveSaved();
            }}
            title={removeSavedLabel}
            aria-label={removeSavedLabel}
            className="inline-flex flex-none cursor-pointer items-center text-primary transition-all hover:scale-110 hover:text-primary/70 active:scale-95"
          >
            <Heart size={13} fill="currentColor" />
          </button>
        )}
        <Link
          to={detailPath}
          onClick={onDetailsClick}
          aria-disabled={interactive ? undefined : false}
          className="ml-auto inline-flex flex-none items-center gap-0.5 text-xs font-bold text-primary transition-all hover:gap-1.5 hover:underline"
        >
          {viewDetailsLabel} <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  );
}

