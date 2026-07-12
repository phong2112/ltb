import { Link } from "react-router";
import { ChevronRight, MapPin, Users } from "lucide-react";
import type { Job } from "@/app/data";
import { useLanguage } from "@/app/i18n";

type PublicJobCardProps = {
  job: Job;
};

export default function PublicJobCard({ job }: PublicJobCardProps) {
  const { t } = useLanguage();

  return (
    <Link
      to={`/jobs/${job.id}`}
      className="group bg-white border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-lg transition-all duration-200 flex flex-col gap-3 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-pink-50/0 to-pink-50/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />
      <div className="relative flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-pink-50 flex items-center justify-center text-2xl flex-shrink-0 border border-pink-100">
            {job.logo}
          </div>
          <div>
            <h3
              className="font-bold text-foreground text-sm leading-tight group-hover:text-primary transition-colors"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {job.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{job.company}</p>
          </div>
        </div>
        {job.urgent && (
          <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-bold rounded-full border border-rose-200 flex-shrink-0">
            🔥 {t("jobs.urgent")}
          </span>
        )}
      </div>
      <div className="relative flex flex-wrap gap-1.5">
        {job.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="px-2 py-0.5 bg-pink-50 border border-pink-100 text-primary text-[10px] rounded-lg font-medium">
            {tag}
          </span>
        ))}
      </div>
      <div className="relative flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin size={10} />
          {job.location}
        </span>
        <span className="ml-auto font-semibold text-amber-600 text-[11px]">💰 {job.salary}</span>
      </div>
      <div className="relative flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users size={10} />
          {job.applicants} {t("common.candidates")}
        </span>
        <span className="flex items-center gap-0.5 font-semibold text-primary group-hover:gap-1.5 transition-all">
          {t("common.viewDetails")} <ChevronRight size={12} />
        </span>
      </div>
    </Link>
  );
}
