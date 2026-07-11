import { useState } from "react";
import { Link } from "react-router";
import { Search, Filter, Star, ChevronRight, Users } from "lucide-react";
import { useData, CandidateStatus } from "@/app/data";
import { translateCandidateStatus, useLanguage } from "@/app/i18n";
import AdminLayout from "@/app/layouts/AdminLayout";

const STATUS_OPTS: { val: CandidateStatus | "all"; color: string }[] = [
  { val: "all", color: "" },
  { val: "new", color: "bg-blue-100 text-blue-700" },
  { val: "reviewing", color: "bg-amber-100 text-amber-700" },
  { val: "interview", color: "bg-purple-100 text-purple-700" },
  { val: "offered", color: "bg-emerald-100 text-emerald-700" },
  { val: "rejected", color: "bg-red-100 text-red-600" },
];

export default function CandidateInbox() {
  const { candidates, jobs } = useData();
  const { language, t } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CandidateStatus | "all">("all");
  const [jobFilter, setJobFilter] = useState("all");

  const filtered = candidates.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.jobTitle.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchJob = jobFilter === "all" || c.jobId === jobFilter;
    return matchSearch && matchStatus && matchJob;
  });

  const statusInfo = (s: CandidateStatus) => STATUS_OPTS.find(o => o.val === s) || STATUS_OPTS[0];

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("admin.candidateInbox")}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{candidates.length} {t("admin.totalCandidatesSummary")} · {candidates.filter(c => c.status === "new").length} {t("admin.unreviewed")}</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-border p-4 mb-4 space-y-3">
        <div className="flex items-center gap-2 bg-background rounded-xl px-3 py-2 border border-border">
          <Search size={14} className="text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("admin.searchCandidates")} className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground" />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTS.map(s => (
            <button key={s.val} onClick={() => setStatusFilter(s.val as any)}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${statusFilter === s.val ? "bg-primary text-white border-primary" : "bg-white border-border text-muted-foreground hover:border-primary hover:text-primary"}`}
            >{translateCandidateStatus(s.val, language)}</button>
          ))}
          <div className="w-px h-4 bg-border self-center" />
          <select value={jobFilter} onChange={e => setJobFilter(e.target.value)} className="px-3 py-1 rounded-full text-xs font-bold border border-border bg-white text-muted-foreground outline-none focus:border-primary transition-colors">
            <option value="all">{t("admin.allPositions")}</option>
            {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
          <span className="ml-auto text-xs text-muted-foreground self-center">{filtered.length} {t("jobs.resultCount")}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users size={32} className="mx-auto mb-3 opacity-40" />
            <p className="font-semibold">{t("admin.noCandidates")}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(c => {
              const si = statusInfo(c.status);
              return (
                <Link key={c.id} to={`/admin/candidates/${c.id}`} className="flex items-center gap-4 p-4 hover:bg-pink-50/50 transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">{c.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">{c.name}</p>
                      {c.status === "new" && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.jobTitle} · {c.email}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className={`text-sm font-black ${c.aiScore >= 90 ? "text-emerald-600" : c.aiScore >= 75 ? "text-amber-600" : "text-muted-foreground"}`}>{c.aiScore}%</div>
                      <div className="text-[10px] text-muted-foreground">{t("common.aiMatch")}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${si.color || "bg-gray-100 text-gray-600"}`}>{translateCandidateStatus(c.status, language)}</span>
                    <span className="text-xs text-muted-foreground">{c.appliedAt}</span>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
