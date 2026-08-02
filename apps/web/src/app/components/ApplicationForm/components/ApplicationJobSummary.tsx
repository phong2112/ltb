import { Briefcase, MapPin } from "lucide-react";
import type { Job } from "@/app/data";
import { translateJobType, useLanguage } from "@/app/services/i18n-service";

export function ApplicationJobSummary({ job }: { job: Job }) {
  const { language } = useLanguage();

  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/15 bg-white p-3 shadow-sm">
      <div className="flex size-11 flex-none items-center justify-center rounded-xl border border-primary/15 bg-pink-50 text-xl">
        {job.logo}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-extrabold text-foreground">
          {job.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-4 text-muted-foreground">
          <span className="font-semibold text-foreground/70">{job.company}</span>
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {job.location}
          </span>
          <span className="flex items-center gap-1">
            <Briefcase size={11} />
            {translateJobType(job.type, language)}
          </span>
        </div>
      </div>
    </div>
  );
}
