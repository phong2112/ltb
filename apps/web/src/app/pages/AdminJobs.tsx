import { useState } from "react";
import { Link } from "react-router";
import { Plus, Eye, Edit2, Trash2, Globe, FileText, Users, Search } from "lucide-react";
import { useData } from "@/app/data";
import { translateJobStatus, translateJobType, useLanguage } from "@/app/i18n";
import AdminLayout from "@/app/layouts/AdminLayout";

export default function AdminJobs() {
  const { jobs, updateJob, deleteJob } = useData();
  const { language, t } = useLanguage();
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = jobs.filter(j => !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("admin.jobsManagement")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{jobs.filter(j => j.status === "published").length} {t("admin.publishedCount")} · {jobs.filter(j => j.status === "draft").length} {t("admin.draftCount")}</p>
        </div>
        <Link to="/admin/jobs/new" className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-sm">
          <Plus size={15} /> {t("admin.createJob")}
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
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
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${job.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
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
                <button
                  onClick={() => void updateJob(job.id, { status: job.status === "published" ? "draft" : "published" })}
                  title={job.status === "published" ? t("common.unpublish") : t("common.publish")}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-pink-50 ${job.status === "published" ? "text-emerald-600 hover:text-emerald-700" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {job.status === "published" ? <Globe size={15} /> : <FileText size={15} />}
                </button>
                <Link to={`/jobs/${job.id}`} target="_blank" className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-pink-50 transition-colors" title="Xem public">
                  <Eye size={15} />
                </Link>
                <Link to={`/admin/jobs/${job.id}/edit`} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-pink-50 transition-colors" title="Chỉnh sửa">
                  <Edit2 size={15} />
                </Link>
                <button
                  onClick={() => setConfirmDelete(job.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Xoá"
                >
                  <Trash2 size={15} />
                </button>
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

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <h3 className="font-black text-foreground mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{t("admin.deleteJobTitle")}</h3>
            <p className="text-sm text-muted-foreground mb-5">{t("admin.deleteJobBody")}</p>
            <div className="flex gap-3">
              <button onClick={() => { void deleteJob(confirmDelete); setConfirmDelete(null); }} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-all">{t("admin.confirmDelete")}</button>
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-all">{t("admin.cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
