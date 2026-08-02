import type { Job } from "@/app/data";
import { translateJobLevel, translateJobType } from "@/app/services/i18n-service";
import type { Language } from "@/app/services/i18n-service";

type JobTagsProps = {
  job: Job;
  language: Language;
};

export function JobTags({ job, language }: JobTagsProps) {
  return (
    <div className="mt-4 flex min-h-6 flex-wrap content-start gap-1.5">
      <span className="rounded-full bg-pink-100 px-2.5 py-1 text-[10px] font-bold text-pink-700">
        {translateJobType(job.type, language)}
      </span>
      <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground">
        {translateJobLevel(job.level, language)}
      </span>
      {job.tags.slice(0, 3).map((tag) => (
        <span key={tag} className="rounded-full bg-pink-50 px-2.5 py-1 text-[10px] font-semibold text-primary">
          {tag}
        </span>
      ))}
    </div>
  );
}

