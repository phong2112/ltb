import { useState } from "react";
import { Link, useParams } from "react-router";
import {
  Archive,
  Briefcase,
  Building2,
  ChevronDown,
  ChevronLeft,
  CircleStop,
  DollarSign,
  Edit2,
  ExternalLink,
  Globe,
  GraduationCap,
  LoaderCircle,
  MapPin,
  RotateCcw,
  Tag,
  Users,
} from "lucide-react";
import { type JobStatus, useData } from "@/app/data";
import { translateJobLevel, translateJobStatus, translateJobType, useLanguage } from "@/app/i18n";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import RichTextContent from "@/app/components/RichTextContent";
import JobApplicantsAside from "@/app/components/JobApplicantsAside";
import AdminLayout from "@/app/layouts/AdminLayout";
import { JOB_STATUS_CONFIG, URGENT_BADGE_CLASS } from "@/app/status-config";

const statusDotClass: Record<JobStatus, string> = {
  published: "bg-emerald-500",
  draft: "bg-slate-400",
  closed: "bg-amber-500",
  archived: "bg-slate-600",
};

function DetailItem({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-background/55 p-3.5">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
        <span className="flex size-7 items-center justify-center rounded-lg bg-white text-primary shadow-sm ring-1 ring-border/70">
          {icon}
        </span>
        <span>{label}</span>
      </div>
      <div className="truncate pl-9 text-sm font-bold text-foreground" title={typeof children === "string" ? children : undefined}>{children}</div>
    </div>
  );
}

function cleanLabel(label: string) {
  return label.replace(/\s*\*$/, "").replace(/\s*\([^)]*\)\s*$/, "");
}

export default function AdminJobDetail() {
  const { id } = useParams();
  const { jobs, isLoading, updateJob } = useData();
  const { language, t } = useLanguage();
  const [updatingStatus, setUpdatingStatus] = useState<JobStatus | null>(null);
  const job = jobs.find(item => item.id === id);

  async function handleStatusChange(status: JobStatus) {
    if (!job || updatingStatus) return;

    setUpdatingStatus(status);
    try {
      await updateJob(job.id, { status });
    } catch {
      // The shared data service displays the API error notification.
    } finally {
      setUpdatingStatus(null);
    }
  }

  if (!job && isLoading) {
    return <AdminLayout><div className="py-24 text-center text-sm font-semibold text-muted-foreground">{t("common.loading")}</div></AdminLayout>;
  }

  if (!job) {
    return (
      <AdminLayout>
        <div className="rounded-2xl border border-border bg-white p-10 text-center">
          <p className="mb-4 font-bold text-foreground">{t("admin.jobNotFound")}</p>
          <Link to="/admin/jobs" className="font-semibold text-primary hover:underline">{t("common.backToList")}</Link>
        </div>
      </AdminLayout>
    );
  }

  const salaryLabel = job.salary || t("jobs.salaryNegotiable");
  return (
    <AdminLayout>
      <div className="w-full max-w-[1560px]">
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <header className="sticky top-20 z-20 min-w-0 rounded-2xl border border-border/80 bg-white px-5 py-4 shadow-[0_10px_30px_rgba(120,70,86,0.06)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <Link to="/admin/jobs" className="mb-2 inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-muted-foreground transition-colors hover:text-primary">
                  <ChevronLeft size={14} /> {t("common.backToList")}
                </Link>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-black leading-tight text-foreground">{job.title}</h1>
                  {job.urgent && <span className={`flex-none rounded-full border px-2 py-0.5 text-[10px] font-bold ${URGENT_BADGE_CLASS}`}>🔥 {t("jobs.urgent")}</span>}
                </div>
                <p className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <span className="text-base leading-none" aria-hidden="true">{job.logo}</span>
                  <span className="truncate">{job.company}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={Boolean(updatingStatus)}
                      className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-border bg-white px-3.5 text-sm font-bold text-foreground transition-colors hover:border-primary/40 hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label={`${t("admin.status")}: ${translateJobStatus(job.status, language)}`}
                    >
                      {updatingStatus ? <LoaderCircle size={14} className="animate-spin text-primary" /> : <span className={`size-2 rounded-full ${statusDotClass[job.status]}`} />}
                      {translateJobStatus(job.status, language)}
                      <ChevronDown size={14} className="text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5">
                    {job.status === "archived" ? (
                      <DropdownMenuItem onSelect={() => void handleStatusChange("closed")} className="cursor-pointer rounded-lg py-2 font-semibold">
                        <RotateCcw /> {t("admin.restoreJob")}
                      </DropdownMenuItem>
                    ) : (
                      <>
                        {job.status === "published" ? (
                          <DropdownMenuItem onSelect={() => void handleStatusChange("closed")} className="cursor-pointer rounded-lg py-2 font-semibold text-amber-700 focus:text-amber-700">
                            <CircleStop className="text-amber-600" /> {t("admin.closeJob")}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => void handleStatusChange("published")} className="cursor-pointer rounded-lg py-2 font-semibold text-emerald-700 focus:text-emerald-700">
                            <Globe className="text-emerald-600" /> {t("common.publish")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={() => void handleStatusChange("archived")} className="cursor-pointer rounded-lg py-2 font-semibold">
                          <Archive /> {t("admin.archiveJob")}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                {job.status === "published" && (
                  <Link to={`/jobs/${job.id}`} target="_blank" rel="noreferrer" className="flex h-10 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-pink-50 hover:text-primary">
                    <ExternalLink size={14} /> {t("admin.viewPublic")}
                  </Link>
                )}
                <Link to={`/admin/jobs/${job.id}/edit`} className="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md">
                  <Edit2 size={14} /> {t("admin.editJobAction")}
                </Link>
              </div>
            </div>
          </header>

          <JobApplicantsAside jobId={job.id} />

          <div className="min-w-0 space-y-5 xl:col-start-1">
            <section className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-[0_10px_30px_rgba(120,70,86,0.04)]">
              <div className="flex flex-col gap-4 border-b border-border bg-gradient-to-r from-pink-50/80 via-white to-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-12 flex-none items-center justify-center rounded-2xl border border-pink-100 bg-white text-2xl shadow-sm">{job.logo}</div>
                  <div className="min-w-0">
                    <h2 className="truncate font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("jobDetail.overview")}</h2>
                    <p className="mt-0.5 truncate text-xs font-semibold text-muted-foreground">{job.company} · {job.location}</p>
                  </div>
                </div>
                <span className={`w-fit flex-none rounded-full border px-3 py-1 text-xs font-bold ${JOB_STATUS_CONFIG[job.status].badgeClass}`}>{translateJobStatus(job.status, language)}</span>
              </div>

              <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem icon={<Building2 size={14} />} label={cleanLabel(t("admin.companyName"))}>{job.company}</DetailItem>
                <DetailItem icon={<MapPin size={14} />} label={cleanLabel(t("admin.location"))}>{job.location}</DetailItem>
                <DetailItem icon={<Briefcase size={14} />} label={t("admin.workType")}>{translateJobType(job.type, language)}</DetailItem>
                <DetailItem icon={<GraduationCap size={14} />} label={t("admin.level")}>{translateJobLevel(job.level, language)}</DetailItem>
                <DetailItem icon={<DollarSign size={14} />} label={t("admin.salary")}>{salaryLabel}</DetailItem>
                <DetailItem icon={<Users size={14} />} label={t("common.candidates")}>{job.applicants}</DetailItem>
              </div>

              <div className="border-t border-border px-5 py-4">
                <div className="mb-2.5 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
                  <Tag size={13} className="text-primary" /> {cleanLabel(t("admin.skillTags"))}
                </div>
                <div className="flex min-h-7 flex-wrap items-center gap-2">
                  {job.tags.length > 0 ? job.tags.map(tag => <span key={tag} className="inline-flex items-center rounded-full border border-primary/10 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{tag}</span>) : <span className="text-sm text-muted-foreground">—</span>}
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-[0_10px_30px_rgba(120,70,86,0.04)]">
              {[
                [t("jobDetail.description"), job.description],
                [t("jobDetail.requirements"), job.requirements],
                [t("jobDetail.benefits"), job.benefits],
              ].map(([label, value], index) => (
                <div key={label} className={`px-5 py-5 sm:px-6 sm:py-6 ${index > 0 ? "border-t border-border" : ""}`}>
                  <div className="mb-3 flex items-center gap-3">
                    <span className="h-5 w-1 rounded-full bg-primary" />
                    <h2 className="text-lg font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{label}</h2>
                  </div>
                  {value ? <RichTextContent value={value} className="pl-4 text-sm text-foreground sm:pl-0" /> : <p className="text-sm text-muted-foreground">—</p>}
                </div>
              ))}
            </section>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
