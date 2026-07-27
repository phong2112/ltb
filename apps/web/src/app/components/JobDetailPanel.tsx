import { useEffect, useRef } from "react";
import { Briefcase, Building2, Clock, DollarSign, Heart, MapPin } from "lucide-react";
import type { Job } from "@/app/data";
import { useData } from "@/app/data";
import { translateJobLevel, translateJobType, useLanguage } from "@/app/i18n";
import { notificationService } from "@/app/services/notification";
import RichTextContent from "@/app/components/RichTextContent";
import ApplicationDialog from "@/app/components/ApplicationDialog";

export default function JobDetailPanel({ job }: { job: Job }) {
  const { isJobSaved, toggleSavedJob } = useData();
  const { language, t } = useLanguage();
  const contentRef = useRef<HTMLDivElement>(null);
  const saved = isJobSaved(job.id);
  const salary = job.salary || t("jobs.salaryNegotiable");

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [job.id]);

  function toggleSaved() {
    const isNowSaved = toggleSavedJob(job.id);
    notificationService.info(t(isNowSaved ? "savedJobs.savedNotice" : "savedJobs.removedNotice"));
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm lg:flex lg:h-full lg:min-h-0 lg:flex-col">
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
        {job.tags.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{job.tags.map(tag => <span key={tag} className="rounded-full border border-pink-100 bg-pink-50 px-2.5 py-1 text-[11px] font-semibold text-primary">{tag}</span>)}</div>}
        <div className="mt-3.5 flex flex-col gap-2 border-t border-border pt-3.5 sm:flex-row">
          <ApplicationDialog job={job} triggerClassName="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md active:translate-y-0" />
          <button type="button" onClick={toggleSaved} aria-pressed={saved} className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98] ${saved ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}><Heart size={15} fill={saved ? "currentColor" : "none"} /> {saved ? t("jobDetail.savedJob") : t("jobDetail.saveJob")}</button>
        </div>
      </div>
      <div ref={contentRef} className="scrollbar-stable space-y-7 p-5 lg:min-h-0 lg:flex-1 lg:overscroll-contain lg:overflow-y-auto lg:p-6">
        <div className="grid gap-2 rounded-xl bg-pink-50/60 p-4 text-xs text-muted-foreground sm:grid-cols-2">
          <span className="flex items-center gap-2"><Building2 size={13} className="text-primary" />{job.company}</span>
          <span className="flex items-center gap-2"><MapPin size={13} className="text-primary" />{job.location}</span>
          <span className="flex items-center gap-2"><Briefcase size={13} className="text-primary" />{translateJobType(job.type, language)} · {translateJobLevel(job.level, language)}</span>
          <span className="flex items-center gap-2"><DollarSign size={13} className="text-primary" />{salary}</span>
        </div>
        {[[t("jobDetail.description"), job.description], [t("jobDetail.requirements"), job.requirements], [t("jobDetail.benefits"), job.benefits]].map(([title, content]) => (
          <section key={title}>
            <h3 className="mb-3 text-lg font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{title}</h3>
            {content ? <RichTextContent value={content} className="text-sm text-foreground" /> : <p className="text-sm text-muted-foreground">—</p>}
          </section>
        ))}
      </div>
    </article>
  );
}
