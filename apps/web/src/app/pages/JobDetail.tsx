import { Link, useParams, useSearchParams } from "react-router";
import { Briefcase, Building2, ChevronLeft, Clock, DollarSign, Heart, MapPin, RefreshCw, Users } from "lucide-react";
import { useData } from "@/app/data";
import { translateJobLevel, translateJobType, useLanguage } from "@/app/i18n";
import PublicLayout from "@/app/layouts/PublicLayout";
import RichTextContent from "@/app/components/RichTextContent";
import { notificationService } from "@/app/services/notification";
import { URGENT_BADGE_CLASS } from "@/app/status-config";
import ApplicationDialog from "@/app/components/ApplicationDialog";

const typeColors: Record<string, string> = {
  "Full-time": "bg-pink-100 text-pink-700",
  Hybrid: "bg-purple-100 text-purple-700",
  Remote: "bg-emerald-100 text-emerald-700",
};

export default function JobDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { error, isJobSaved, isLoading, jobs, reloadPublicJobs, toggleSavedJob } = useData();
  const { language, t } = useLanguage();
  const job = jobs.find(item => item.id === id && item.status === "published");

  if (!job && isLoading) {
    return (
      <PublicLayout>
        <JobDetailLoadingState />
      </PublicLayout>
    );
  }

  if (!job && error) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-md px-4 py-20 text-center sm:py-28">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-pink-50 text-primary"><RefreshCw size={21} /></div>
          <p className="mt-4 text-lg font-black text-foreground">{t("jobs.loadError")}</p>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{error}</p>
          <button type="button" onClick={() => void reloadPublicJobs()} className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90">
            {t("common.retry")}
          </button>
        </div>
      </PublicLayout>
    );
  }

  if (!job) {
    return (
      <PublicLayout>
        <div className="px-4 py-20 text-center sm:py-32">
          <div className="mb-4 text-5xl">🌸</div>
          <p className="mb-2 text-xl font-bold text-foreground">{t("jobDetail.notFound")}</p>
          <Link to="/jobs" className="text-sm font-semibold text-primary underline underline-offset-4">{t("common.backToJobs")}</Link>
        </div>
      </PublicLayout>
    );
  }

  const saved = isJobSaved(job.id);
  const jobId = job.id;
  const salaryLabel = job.salary || t("jobs.salaryNegotiable");
  const backToJobsPath = buildBackToJobsPath(searchParams.get("from"), jobId);

  function toggleSaved() {
    const isNowSaved = toggleSavedJob(jobId);
    notificationService.info(t(isNowSaved ? "savedJobs.savedNotice" : "savedJobs.removedNotice"));
  }

  return (
    <PublicLayout hasMobileBottomBar>
      <div className="mx-auto max-w-5xl px-4 pb-6 pt-4 sm:px-6 sm:py-8">
        <Link to={backToJobsPath} className="mb-4 inline-flex min-h-10 items-center gap-1 rounded-lg pr-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-white hover:text-primary sm:mb-6">
          <ChevronLeft size={16} /> {t("common.backToList")}
        </Link>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          <main className="space-y-4 sm:space-y-5 lg:col-span-2">
            <section className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-start gap-3.5 sm:gap-4">
                <div className="flex size-14 flex-none items-center justify-center rounded-xl border border-pink-100 bg-pink-50 text-3xl sm:size-16 sm:rounded-2xl sm:text-4xl">{job.logo}</div>
                <div className="min-w-0 flex-1">
                  <h1 className="break-words text-[22px] font-black leading-[1.18] text-foreground sm:text-2xl">{job.title}</h1>
                  <p className="mt-1 text-sm font-bold text-muted-foreground sm:text-base">{job.company}</p>
                  {job.urgent && (
                    <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold sm:text-xs ${URGENT_BADGE_CLASS}`}>
                      🔥 {t("jobs.urgentHiring")}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4 text-xs text-muted-foreground sm:flex sm:flex-wrap sm:gap-x-4 sm:gap-y-2">
                <span className="flex min-w-0 items-center gap-1.5"><MapPin size={13} className="flex-none text-primary" /><span className="truncate">{job.location}</span></span>
                <span className="flex items-center gap-1.5"><Clock size={13} className="text-primary" />{job.posted}</span>
                <span className="col-span-2 flex items-center gap-1.5 sm:col-span-1"><Users size={13} className="text-primary" />{job.applicants} {t("jobs.applicantsApplied")}</span>
              </div>

              <div className="mt-4 space-y-4">
                <section>
                  <h2 className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground sm:text-[11px]">{t("jobDetail.overview")}</h2>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${typeColors[job.type] || "bg-pink-100 text-pink-700"}`}>{translateJobType(job.type, language)}</span>
                    <span className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground">{translateJobLevel(job.level, language)}</span>
                    <span className="max-w-full truncate rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">💰 {salaryLabel}</span>
                  </div>
                </section>

                <section className="border-t border-border/70 pt-3">
                  <h2 className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground sm:text-[11px]">{t("jobDetail.skills")}</h2>
                  <div className="flex flex-wrap gap-2">
                    {job.tags.length > 0
                      ? job.tags.map(tag => <span key={tag} className="rounded-full border border-pink-100 bg-pink-50 px-3 py-1.5 text-xs font-semibold text-primary">{tag}</span>)
                      : <span className="text-xs text-muted-foreground">{t("jobDetail.noTags")}</span>}
                  </div>
                </section>
              </div>
            </section>

            <JobContentSection title={t("jobDetail.description")} value={job.description} />
            <JobContentSection title={t("jobDetail.requirements")} value={job.requirements} />
            <JobContentSection title={t("jobDetail.benefits")} value={job.benefits} />
          </main>

          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-border bg-white p-5 shadow-sm">
              <h2 className="mb-2 font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("jobDetail.applyNow")}</h2>
              <p className="mb-4 text-xs leading-5 text-muted-foreground">{t("jobDetail.applyBody")}</p>
              <ApplicationDialog job={job} triggerClassName="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md active:translate-y-0" />
              <button
                type="button"
                onClick={toggleSaved}
                aria-pressed={saved}
                className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98] ${saved ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}
              >
                <Heart size={14} fill={saved ? "currentColor" : "none"} /> {saved ? t("jobDetail.savedJob") : t("jobDetail.saveJob")}
              </button>

              <div className="mt-5 space-y-2.5 border-t border-border pt-4">
                <JobFact icon={<Building2 size={14} />} value={job.company} />
                <JobFact icon={<MapPin size={14} />} value={job.location} />
                <JobFact icon={<Briefcase size={14} />} value={`${translateJobType(job.type, language)} · ${translateJobLevel(job.level, language)}`} />
                <JobFact icon={<DollarSign size={14} />} value={salaryLabel} />
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 px-4 pt-3 shadow-[0_-8px_30px_rgba(74,37,50,0.12)] backdrop-blur lg:hidden" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
        <div className="mx-auto flex max-w-2xl items-center gap-2.5">
          <ApplicationDialog job={job} triggerClassName="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary/90" />
          <button
            type="button"
            onClick={toggleSaved}
            aria-label={saved ? t("jobDetail.savedJob") : t("jobDetail.saveJob")}
            aria-pressed={saved}
            className={`inline-flex size-12 flex-none items-center justify-center rounded-xl border transition-colors ${saved ? "border-primary bg-primary/10 text-primary" : "border-border bg-white text-muted-foreground"}`}
          >
            <Heart size={19} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
    </PublicLayout>
  );
}

function JobContentSection({ title, value }: { title: string; value: string }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-6">
      <h2 className="mb-3 text-lg font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{title}</h2>
      {value
        ? <RichTextContent value={value} className="text-[15px] leading-7 text-foreground" />
        : <p className="text-sm text-muted-foreground">—</p>}
    </section>
  );
}

function JobFact({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
      <span className="mt-0.5 flex-none text-primary">{icon}</span>
      <span className="min-w-0 break-words">{value}</span>
    </div>
  );
}

function JobDetailLoadingState() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-4 py-5 sm:px-6 sm:py-8" aria-hidden="true">
      <div className="mb-5 h-9 w-36 rounded-lg bg-white/70" />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="h-72 rounded-2xl border border-border bg-white/70" />
          <div className="h-64 rounded-2xl border border-border bg-white/70" />
        </div>
        <div className="hidden h-72 rounded-2xl border border-border bg-white/70 lg:block" />
      </div>
    </div>
  );
}

function buildBackToJobsPath(returnTo: string | null, jobId: string) {
  const fallback = `/jobs?job=${encodeURIComponent(jobId)}`;
  if (!returnTo || returnTo.startsWith("//")) return fallback;

  try {
    const url = new URL(returnTo, "https://local.app");
    if (url.pathname !== "/jobs") return fallback;
    url.searchParams.set("job", jobId);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
