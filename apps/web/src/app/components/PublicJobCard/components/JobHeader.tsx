import { Link } from "react-router";
import type { Job } from "@/app/data";
import { URGENT_BADGE_CLASS } from "@/app/utils/configs/status-config";

type JobHeaderProps = {
  interactive: boolean;
  job: Job;
  urgentLabel: string;
};

export function JobHeader({ interactive, job, urgentLabel }: JobHeaderProps) {
  return (
    <>
      {job.urgent && (
        <span className={`absolute right-4 top-4 rounded-full border px-2.5 py-1 text-[10px] font-bold ${URGENT_BADGE_CLASS}`}>
          🔥 {urgentLabel}
        </span>
      )}

      <div className="flex items-start gap-3">
        <div className="flex size-12 flex-none items-center justify-center rounded-2xl border border-pink-100 bg-pink-50 text-2xl">
          {job.logo}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={`line-clamp-2 text-base font-black leading-snug text-foreground transition-colors group-hover:text-primary ${job.urgent ? "pr-16" : ""}`}>
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
    </>
  );
}

