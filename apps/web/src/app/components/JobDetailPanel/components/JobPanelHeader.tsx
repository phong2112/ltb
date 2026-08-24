import { Clock, MapPin } from "lucide-react";
import { translateJobLevel, translateJobType } from "@/app/services/i18n-service";
import type { JobDetailSharedProps } from "@/app/components/JobDetailPanel/types";

type JobPanelHeaderProps = JobDetailSharedProps & {
  actions: React.ReactNode;
};

export function JobPanelHeader({ actions, job, language, salary }: JobPanelHeaderProps) {
  return (
    <div className="flex-none border-b border-border p-4 lg:p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-12 flex-none items-center justify-center rounded-xl border border-pink-100 bg-pink-50 text-2xl">{job.logo}</div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black leading-tight text-foreground lg:text-[22px]">{job.title}</h2>
          <p className="mt-0.5 text-sm font-semibold text-muted-foreground">{job.company}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin size={12} />{job.location}</span>
            <span className="flex items-center gap-1"><Clock size={12} />{job.posted}</span>
          </div>
        </div>
      </div>
      <div className="mt-3.5 flex flex-wrap gap-2">
        <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-bold text-pink-700">{translateJobType(job.type, language)}</span>
        <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">{translateJobLevel(job.level, language)}</span>
        <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">💰 {salary}</span>
      </div>
      {job.tags.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{job.tags.map((tag) => <span key={tag} className="rounded-full border border-pink-100 bg-pink-50 px-2.5 py-1 text-[11px] font-semibold text-primary">{tag}</span>)}</div>}
      <div className="mt-3.5 border-t border-border pt-3.5">
        {actions}
      </div>
    </div>
  );
}

