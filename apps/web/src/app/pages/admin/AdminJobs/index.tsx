import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Archive, Briefcase, Building2, CircleStop, Eye, Globe, MapPin, Plus, RotateCcw, Search, Users } from "lucide-react";
import { type JobStatus, useData } from "@/app/data";
import { translateJobStatus, translateJobType, useLanguage } from "@/app/services/i18n-service";
import ListPagination from "@/app/components/ListPagination";
import AdminLayout from "@/app/layouts/AdminLayout";
import { JOB_STATUS_CONFIG, URGENT_BADGE_CLASS } from "@/app/utils/configs/status-config";
import { appendReturnTo } from "@/app/utils/navigation";

const ITEMS_PER_PAGE = 10;
const JOB_STATUS_FILTERS = ["active", "published", "draft", "closed", "archived"] as const;
type JobStatusFilter = JobStatus | "active";

export default function AdminJobs() {
  const { jobs, updateJob } = useData();
  const { language, t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<JobStatusFilter>(() => readJobStatusFilter(searchParams));
  const [currentPage, setCurrentPage] = useState(() => readPositivePage(searchParams));

  const visibleJobs = jobs.filter(job => statusFilter === "active" ? job.status !== "archived" : job.status === statusFilter);
  const filtered = visibleJobs.filter(j => !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const activePage = Math.min(currentPage, totalPages);
  const returnTo = buildJobsReturnTo(search, statusFilter, activePage);
  const paginatedJobs = filtered.slice((activePage - 1) * ITEMS_PER_PAGE, activePage * ITEMS_PER_PAGE);
  const counts = {
    published: jobs.filter(j => j.status === "published").length,
    draft: jobs.filter(j => j.status === "draft").length,
    closed: jobs.filter(j => j.status === "closed").length,
    archived: jobs.filter(j => j.status === "archived").length,
  };
  const filterOptions: { value: JobStatusFilter; label: string }[] = [
    { value: "active", label: t("admin.activeJobs") },
    { value: "published", label: translateJobStatus("published", language) },
    { value: "draft", label: translateJobStatus("draft", language) },
    { value: "closed", label: translateJobStatus("closed", language) },
    { value: "archived", label: translateJobStatus("archived", language) },
  ];

  useEffect(() => {
    setCurrentPage(page => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
    setStatusFilter(readJobStatusFilter(searchParams));
    setCurrentPage(readPositivePage(searchParams));
  }, [searchParams]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    setOptionalParam(next, "q", search.trim());
    setOptionalParam(next, "status", statusFilter === "active" ? "" : statusFilter);
    setOptionalParam(next, "page", currentPage > 1 ? String(currentPage) : "");
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
  }, [currentPage, search, searchParams, setSearchParams, statusFilter]);

  const togglePublishedStatus = (job: { id: string; status: JobStatus }) => {
    const nextStatus: JobStatus = job.status === "published" ? "closed" : "published";
    updateJobStatus(job.id, nextStatus);
  };

  const updateJobStatus = (id: string, status: JobStatus) => {
    void updateJob(id, { status }).catch(() => undefined);
  };

  return (
    <AdminLayout>
      <div className="mb-4 flex flex-col gap-3 min-[480px]:mb-6 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
        <div>
          <h1 className="text-xl font-black text-foreground min-[480px]:text-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>{t("admin.jobsManagement")}</h1>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground min-[480px]:text-sm">{counts.published} {t("admin.publishedCount")} · {counts.draft} {t("admin.draftCount")} · {counts.closed} {t("admin.closedCount")} · {counts.archived} {t("admin.archivedCount")}</p>
        </div>
        <Link to="/admin/jobs/new" className="flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary/90">
          <Plus size={15} /> {t("admin.createJob")}
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="space-y-3 border-b border-border p-3 sm:p-4">
          <div className="scrollbar-horizontal -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {filterOptions.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  setStatusFilter(option.value);
                  setCurrentPage(1);
                }}
                className={`h-8 flex-none rounded-full border px-3 text-xs font-bold transition-colors ${statusFilter === option.value ? "border-primary bg-primary text-white" : "border-border bg-white text-muted-foreground hover:border-primary hover:text-primary"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-background rounded-xl px-3 py-2 border border-border">
            <Search size={14} className="text-muted-foreground" />
            <input value={search} onChange={e => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }} placeholder={t("admin.searchJobs")} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2 bg-background/35 p-2 sm:space-y-0 sm:divide-y sm:divide-border sm:bg-transparent sm:p-0">
          {paginatedJobs.map(job => (
            <div key={job.id} className="rounded-xl border border-border bg-white p-3 transition-colors hover:bg-pink-50/50 sm:flex sm:flex-row sm:items-center sm:gap-4 sm:rounded-none sm:border-0 sm:p-4">
              <Link to={appendReturnTo(`/admin/jobs/${job.id}`, returnTo)} className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:items-center sm:gap-4" aria-label={`${t("admin.viewJobDetail")}: ${job.title}`}>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-pink-100 bg-pink-50 text-xl">{job.logo}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex min-w-0 items-start justify-between gap-2 sm:flex-wrap sm:items-center sm:justify-start">
                    <p className="min-w-0 text-base font-black leading-snug text-foreground hover:text-primary sm:max-w-[360px] sm:truncate sm:text-sm sm:font-bold">{job.title}</p>
                    <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${JOB_STATUS_CONFIG[job.status].badgeClass}`}>
                      {translateJobStatus(job.status, language)}
                    </span>
                  </div>
                  {job.urgent && <span className={`mt-1.5 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold sm:mt-0 sm:hidden ${URGENT_BADGE_CLASS}`}>🔥 {t("jobs.urgent")}</span>}
                  <div className="mt-3 grid min-w-0 gap-1.5 text-xs leading-5 text-muted-foreground min-[420px]:grid-cols-2 sm:mt-0.5 sm:flex sm:items-center sm:gap-3 sm:overflow-hidden">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Building2 size={12} className="flex-none text-primary/70 sm:hidden" />
                      <span className="truncate">{job.company}</span>
                    </span>
                    <span className="hidden sm:inline">·</span>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <MapPin size={12} className="flex-none text-primary/70 sm:hidden" />
                      <span className="line-clamp-1 sm:truncate">{job.location}</span>
                    </span>
                    <span className="hidden sm:inline">·</span>
                    <span className="flex items-center gap-1.5">
                      <Briefcase size={12} className="flex-none text-primary/70 sm:hidden" />
                      {translateJobType(job.type, language)}
                    </span>
                    <span className="flex items-center gap-1.5"><Users size={12} className="flex-none text-primary/70 sm:size-[10px] sm:text-current" />{job.applicants} {t("common.candidates")}</span>
                    {job.urgent && <span className={`hidden rounded-full border px-2 py-0.5 text-[10px] font-bold sm:inline-flex ${URGENT_BADGE_CLASS}`}>🔥 {t("jobs.urgent")}</span>}
                  </div>
                </div>
              </Link>
              <div className="mt-3 flex flex-shrink-0 items-center justify-end gap-1 rounded-lg bg-background/70 p-1 sm:mt-0 sm:border-0 sm:bg-transparent sm:p-0">
                {job.status === "archived" ? (
                  <button disabled className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/40" title={t("admin.restoreBeforePublishing")}>
                    <Globe size={15} />
                  </button>
                ) : (
                  <button
                    onClick={() => togglePublishedStatus(job)}
                    title={job.status === "published" ? t("admin.closeJob") : t("common.publish")}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-pink-50 ${job.status === "published" ? "text-emerald-600 hover:text-emerald-700" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {job.status === "published" ? <CircleStop size={15} /> : <Globe size={15} />}
                  </button>
                )}
                {job.status === "published" ? (
                  <Link to={`/jobs/${job.id}`} target="_blank" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-pink-50 hover:text-primary" title={t("admin.viewPublic")}>
                    <Eye size={15} />
                  </Link>
                ) : (
                  <button disabled className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/40" title={t("admin.publicViewUnavailable")}>
                    <Eye size={15} />
                  </button>
                )}
                {job.status === "archived" ? (
                  <button
                    onClick={() => updateJobStatus(job.id, "closed")}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-amber-50 hover:text-amber-700"
                    title={t("admin.restoreJob")}
                  >
                    <RotateCcw size={15} />
                  </button>
                ) : (
                  <button
                    onClick={() => updateJobStatus(job.id, "archived")}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-slate-50 hover:text-slate-700"
                    title={t("admin.archiveJob")}
                  >
                    <Archive size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <div className="text-4xl mb-3">📋</div>
              <p className="font-semibold">{t("admin.noJobs")}</p>
            </div>
          )}
        </div>
        <ListPagination currentPage={activePage} pageSize={ITEMS_PER_PAGE} totalItems={filtered.length} onPageChange={setCurrentPage} />
      </div>
    </AdminLayout>
  );
}

function readJobStatusFilter(searchParams: URLSearchParams): JobStatusFilter {
  const value = searchParams.get("status");
  return value && (JOB_STATUS_FILTERS as readonly string[]).includes(value) ? value as JobStatusFilter : "active";
}

function readPositivePage(searchParams: URLSearchParams) {
  const page = Number(searchParams.get("page"));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function setOptionalParam(params: URLSearchParams, key: string, value: string) {
  if (value) {
    params.set(key, value);
  } else {
    params.delete(key);
  }
}

function buildJobsReturnTo(search: string, statusFilter: JobStatusFilter, page: number) {
  const params = new URLSearchParams();
  setOptionalParam(params, "q", search.trim());
  setOptionalParam(params, "status", statusFilter === "active" ? "" : statusFilter);
  setOptionalParam(params, "page", page > 1 ? String(page) : "");
  const query = params.toString();
  return query ? `/admin/jobs?${query}` : "/admin/jobs";
}
