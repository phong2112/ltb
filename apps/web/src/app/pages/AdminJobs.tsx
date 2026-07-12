import { useState } from "react";
import { Link } from "react-router";
import { Archive, CircleStop, Eye, Edit2, Globe, Plus, RotateCcw, Search, Users } from "lucide-react";
import { type JobStatus, useData } from "@/app/data";
import { translateJobStatus, translateJobType, useLanguage } from "@/app/i18n";
import AdminLayout from "@/app/layouts/AdminLayout";

const statusBadgeClass: Record<JobStatus, string> = {
  published: "bg-emerald-100 text-emerald-700",
  draft: "bg-gray-100 text-gray-600",
  closed: "bg-amber-100 text-amber-700",
  archived: "bg-slate-100 text-slate-600",
};

export default function AdminJobs() {
  const { jobs, updateJob } = useData();
  const { language, t } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "active">("active");

  const visibleJobs = jobs.filter(job => statusFilter === "active" ? job.status !== "archived" : job.status === statusFilter);
  const filtered = visibleJobs.filter(j => !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase()));
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

  const togglePublishedStatus = (job: { id: string; status: JobStatus }) => {
    const nextStatus: JobStatus = job.status === "published" ? "closed" : "published";
    void updateJob(job.id, { status: nextStatus });
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("admin.jobsManagement")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{counts.published} {t("admin.publishedCount")} · {counts.draft} {t("admin.draftCount")} · {counts.closed} {t("admin.closedCount")} · {counts.archived} {t("admin.archivedCount")}</p>
        </div>
        <Link to="/admin/jobs/new" className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-sm">
          <Plus size={15} /> {t("admin.createJob")}
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="space-y-3 border-b border-border p-4">
          <div className="flex flex-wrap gap-2">
            {filterOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors ${statusFilter === option.value ? "border-primary bg-primary text-white" : "border-border bg-white text-muted-foreground hover:border-primary hover:text-primary"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-background rounded-xl px-3 py-2 border border-border">
            <Search size={14} className="text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("admin.searchJobs")} className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground" />
          </div>
        </div>

        <div className="divide-y divide-border">
          {filtered.map(job => (
            <div key={job.id} className="flex items-center gap-4 p-4 hover:bg-pink-50/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-xl flex-shrink-0">{job.logo}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-foreground text-sm truncate" style={{ fontFamily: "'Playfair Display', serif" }}>{job.title}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${statusBadgeClass[job.status]}`}>
                    {translateJobStatus(job.status, language)}
                  </span>
                  {job.urgent && <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-bold rounded-full">🔥 {t("jobs.urgent")}</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>{job.company}</span>
                  <span>·</span><span>{job.location}</span>
                  <span>·</span><span>{translateJobType(job.type, language)}</span>
                  <span className="flex items-center gap-1 ml-2"><Users size={10} />{job.applicants} {t("common.candidates")}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
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
                <Link to={`/admin/jobs/${job.id}/edit`} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-pink-50 transition-colors" title="Chỉnh sửa">
                  <Edit2 size={15} />
                </Link>
                {job.status === "archived" ? (
                  <button
                    onClick={() => void updateJob(job.id, { status: "closed" })}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-amber-700 hover:bg-amber-50 transition-colors"
                    title={t("admin.restoreJob")}
                  >
                    <RotateCcw size={15} />
                  </button>
                ) : (
                  <button
                    onClick={() => void updateJob(job.id, { status: "archived" })}
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
      </div>
    </AdminLayout>
  );
}
