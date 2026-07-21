import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Archive, CircleStop, Eye, Globe, Plus, RotateCcw, Search, Users } from "lucide-react";
import { type JobStatus, useData } from "@/app/data";
import { translateJobStatus, translateJobType, useLanguage } from "@/app/i18n";
import ListPagination from "@/app/components/ListPagination";
import AdminLayout from "@/app/layouts/AdminLayout";
import { JOB_STATUS_CONFIG, URGENT_BADGE_CLASS } from "@/app/status-config";

const ITEMS_PER_PAGE = 10;

export default function AdminJobs() {
  const { jobs, updateJob } = useData();
  const { language, t } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "active">("active");
  const [currentPage, setCurrentPage] = useState(1);

  const visibleJobs = jobs.filter(job => statusFilter === "active" ? job.status !== "archived" : job.status === statusFilter);
  const filtered = visibleJobs.filter(j => !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedJobs = filtered.slice((activePage - 1) * ITEMS_PER_PAGE, activePage * ITEMS_PER_PAGE);
  const counts = {
    published: jobs.filter(j => j.status === "published").length,
    draft: jobs.filter(j => j.status === "draft").length,
    closed: jobs.filter(j => j.status === "closed").length,
    archived: jobs.filter(j => j.status === "archived").length,
  };
  const filterOptions: { value: JobStatus | "active"; label: string }[] = [
    { value: "active", label: t("admin.activeJobs") },
    { value: "published", label: translateJobStatus("published", language) },
    { value: "draft", label: translateJobStatus("draft", language) },
    { value: "closed", label: translateJobStatus("closed", language) },
    { value: "archived", label: translateJobStatus("archived", language) },
  ];

  useEffect(() => {
    setCurrentPage(page => Math.min(page, totalPages));
  }, [totalPages]);

  const togglePublishedStatus = (job: { id: string; status: JobStatus }) => {
    const nextStatus: JobStatus = job.status === "published" ? "closed" : "published";
    updateJobStatus(job.id, nextStatus);
  };

  const updateJobStatus = (id: string, status: JobStatus) => {
    void updateJob(id, { status }).catch(() => undefined);
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("admin.jobsManagement")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{counts.published} {t("admin.publishedCount")} · {counts.draft} {t("admin.draftCount")} · {counts.closed} {t("admin.closedCount")} · {counts.archived} {t("admin.archivedCount")}</p>
        </div>
        <Link to="/admin/jobs/new" className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary/90 sm:w-auto">
          <Plus size={15} /> {t("admin.createJob")}
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="space-y-3 border-b border-border p-4">
          <div className="flex flex-wrap gap-2">
            {filterOptions.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  setStatusFilter(option.value);
                  setCurrentPage(1);
                }}
                className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors ${statusFilter === option.value ? "border-primary bg-primary text-white" : "border-border bg-white text-muted-foreground hover:border-primary hover:text-primary"}`}
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
            }} placeholder={t("admin.searchJobs")} className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground" />
          </div>
        </div>

        <div className="divide-y divide-border">
          {paginatedJobs.map(job => (
            <div key={job.id} className="flex flex-col items-stretch gap-3 p-4 transition-colors hover:bg-pink-50/50 sm:flex-row sm:items-center sm:gap-4">
              <Link to={`/admin/jobs/${job.id}`} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:gap-4" aria-label={`${t("admin.viewJobDetail")}: ${job.title}`}>
                <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-xl flex-shrink-0">{job.logo}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-foreground text-sm truncate hover:text-primary">{job.title}</p>
                    <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${JOB_STATUS_CONFIG[job.status].badgeClass}`}>
                      {translateJobStatus(job.status, language)}
                    </span>
                    {job.urgent && <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${URGENT_BADGE_CLASS}`}>🔥 {t("jobs.urgent")}</span>}
                  </div>
                  <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="max-w-full truncate">{job.company}</span>
                    <span>·</span><span>{job.location}</span>
                    <span>·</span><span>{translateJobType(job.type, language)}</span>
                    <span className="flex items-center gap-1 sm:ml-2"><Users size={10} />{job.applicants} {t("common.candidates")}</span>
                  </div>
                </div>
              </Link>
              <div className="flex flex-shrink-0 items-center justify-end gap-1 border-t border-border pt-2 sm:border-0 sm:pt-0">
                {job.status === "archived" ? (
                  <button disabled className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground/40" title={t("admin.restoreBeforePublishing")}>
                    <Globe size={15} />
                  </button>
                ) : (
                  <button
                    onClick={() => togglePublishedStatus(job)}
                    title={job.status === "published" ? t("admin.closeJob") : t("common.publish")}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-pink-50 ${job.status === "published" ? "text-emerald-600 hover:text-emerald-700" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {job.status === "published" ? <CircleStop size={15} /> : <Globe size={15} />}
                  </button>
                )}
                {job.status === "published" ? (
                  <Link to={`/jobs/${job.id}`} target="_blank" className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-pink-50 transition-colors" title={t("admin.viewPublic")}>
                    <Eye size={15} />
                  </Link>
                ) : (
                  <button disabled className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground/40" title={t("admin.publicViewUnavailable")}>
                    <Eye size={15} />
                  </button>
                )}
                {job.status === "archived" ? (
                  <button
                    onClick={() => updateJobStatus(job.id, "closed")}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-amber-700 hover:bg-amber-50 transition-colors"
                    title={t("admin.restoreJob")}
                  >
                    <RotateCcw size={15} />
                  </button>
                ) : (
                  <button
                    onClick={() => updateJobStatus(job.id, "archived")}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-slate-700 hover:bg-slate-50 transition-colors"
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
