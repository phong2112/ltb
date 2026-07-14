import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Search, ChevronRight, Users } from "lucide-react";
import { useData, type CandidateStatus } from "@/app/data";
import { translateCandidateStatus, useLanguage } from "@/app/i18n";
import ListPagination from "@/app/components/ListPagination";
import AdminLayout from "@/app/layouts/AdminLayout";
import { CANDIDATE_STATUS_CONFIG, CANDIDATE_WORKFLOW_STATUSES } from "@/app/status-config";

const ITEMS_PER_PAGE = 10;

const STATUS_OPTS: (CandidateStatus | "all")[] = ["all", ...CANDIDATE_WORKFLOW_STATUSES];

export default function CandidateInbox() {
  const { candidateProfiles, jobs } = useData();
  const { language, t } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CandidateStatus | "all">("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = candidateProfiles.filter(candidate => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || candidate.name.toLowerCase().includes(q)
      || candidate.email.toLowerCase().includes(q)
      || candidate.applications.some(application => application.jobTitle.toLowerCase().includes(q));
    const matchStatus = statusFilter === "all" || candidate.applications.some(application => application.status === statusFilter);
    const matchJob = jobFilter === "all" || candidate.applications.some(application => application.jobId === jobFilter);
    return matchSearch && matchStatus && matchJob;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedCandidates = filtered.slice((activePage - 1) * ITEMS_PER_PAGE, activePage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(page => Math.min(page, totalPages));
  }, [totalPages]);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("admin.candidateInbox")}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{candidateProfiles.length} {t("admin.totalCandidatesSummary")} · {candidateProfiles.filter(candidate => candidate.applications.some(application => application.status === "new")).length} {t("admin.unreviewed")}</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-border p-4 mb-4 space-y-3">
        <div className="flex items-center gap-2 bg-background rounded-xl px-3 py-2 border border-border">
          <Search size={14} className="text-muted-foreground" />
          <input value={search} onChange={e => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }} placeholder={t("admin.searchCandidates")} className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground" />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTS.map(status => (
            <button key={status} onClick={() => {
              setStatusFilter(status);
              setCurrentPage(1);
            }}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${statusFilter === status ? "bg-primary text-white border-primary" : "bg-white border-border text-muted-foreground hover:border-primary hover:text-primary"}`}
            >{translateCandidateStatus(status, language)}</button>
          ))}
          <div className="w-px h-4 bg-border self-center" />
          <select value={jobFilter} onChange={e => {
            setJobFilter(e.target.value);
            setCurrentPage(1);
          }} className="px-3 py-1 rounded-full text-xs font-bold border border-border bg-white text-muted-foreground outline-none focus:border-primary transition-colors">
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
            {paginatedCandidates.map(candidate => {
              const latestApplication = candidate.applications.find(application =>
                (jobFilter === "all" || application.jobId === jobFilter)
                && (statusFilter === "all" || application.status === statusFilter)
              ) ?? candidate.applications[0];

              return (
                <Link key={candidate.id} to={`/admin/candidates/${candidate.id}${latestApplication ? `?application=${latestApplication.applicationId}` : ""}`} className="flex items-center gap-4 p-4 hover:bg-pink-50/50 transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">{candidate.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">{candidate.name}</p>
                      {candidate.applications.some(application => application.status === "new") && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{candidate.applications.length} {t("admin.applications")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{latestApplication?.jobTitle ?? "—"} · {candidate.email || "—"}</p>
                  </div>
                  {latestApplication && <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${CANDIDATE_STATUS_CONFIG[latestApplication.status].badgeClass}`}>{translateCandidateStatus(latestApplication.status, language)}</span>
                    <span className="text-xs text-muted-foreground">{latestApplication.appliedAt}</span>
                  </div>}
                  <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
        <ListPagination currentPage={activePage} pageSize={ITEMS_PER_PAGE} totalItems={filtered.length} onPageChange={setCurrentPage} />
      </div>
    </AdminLayout>
  );
}
