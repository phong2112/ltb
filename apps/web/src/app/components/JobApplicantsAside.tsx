import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Search, Users, X } from "lucide-react";
import { Link } from "react-router";
import { useData } from "@/app/data";
import { translateCandidateStatus, useLanguage } from "@/app/i18n";
import { CANDIDATE_STATUS_CONFIG } from "@/app/status-config";
import ListPagination from "./ListPagination";

const APPLICANTS_PER_PAGE = 10;

export default function JobApplicantsAside({ jobId }: { jobId: string }) {
  const { candidates } = useData();
  const { language, t } = useLanguage();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const jobCandidates = useMemo(
    () => candidates
      .filter(candidate => candidate.jobId === jobId)
      .sort((left, right) => right.appliedAt.localeCompare(left.appliedAt)),
    [candidates, jobId],
  );
  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return jobCandidates;

    return jobCandidates.filter(candidate =>
      candidate.name.toLowerCase().includes(query)
      || candidate.email.toLowerCase().includes(query)
      || candidate.phone.toLowerCase().includes(query),
    );
  }, [jobCandidates, search]);
  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / APPLICANTS_PER_PAGE));
  const activePage = Math.min(page, totalPages);
  const pageStart = (activePage - 1) * APPLICANTS_PER_PAGE;
  const visibleCandidates = filteredCandidates.slice(pageStart, pageStart + APPLICANTS_PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [jobId, search]);

  return (
    <aside className="self-start overflow-hidden rounded-2xl border border-border/80 bg-white shadow-[0_10px_30px_rgba(120,70,86,0.06)] xl:sticky xl:top-20 xl:col-start-2 xl:row-start-1 xl:row-span-2">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-gradient-to-br from-pink-50/90 via-white to-white p-5">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary">{t("admin.applications")}</p>
          <h2 className="flex items-center gap-2 truncate text-lg font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            <Users size={18} className="flex-none text-primary" /> {t("admin.jobApplicants")}
          </h2>
        </div>
        <div className="flex h-11 min-w-11 flex-none items-center justify-center rounded-2xl bg-white px-3 text-base font-black tabular-nums text-primary shadow-sm ring-1 ring-border">
          {jobCandidates.length}
        </div>
      </div>

      {jobCandidates.length > 0 ? (
        <>
          <div className="border-b border-border bg-white px-4 py-3">
            <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:border-primary/50 focus-within:ring-3 focus-within:ring-primary/10">
              <Search size={14} className="flex-none text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("admin.searchJobApplicants")}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label={t("common.clearFilters")}
                  className="flex size-6 flex-none items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-pink-50 hover:text-primary"
                >
                  <X size={13} />
                </button>
              )}
            </label>
            <p className="mt-2 text-[11px] font-semibold text-muted-foreground">
              {filteredCandidates.length}/{jobCandidates.length} {t("admin.jobApplicantsCount")}
            </p>
          </div>

          {visibleCandidates.length > 0 ? (
            <div className="max-h-[min(560px,calc(100vh-290px))] divide-y divide-border overflow-y-auto">
              {visibleCandidates.map(candidate => (
                <Link
                  key={candidate.applicationId}
                  to={`/admin/candidates/${candidate.candidateId}?application=${candidate.applicationId}`}
                  className="group flex items-center gap-3 p-4 transition-colors hover:bg-pink-50/60"
                >
                  <div className="flex size-11 flex-none items-center justify-center rounded-2xl bg-primary/10 text-sm font-black text-primary ring-1 ring-primary/10">{candidate.name.charAt(0)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-black text-foreground transition-colors group-hover:text-primary">{candidate.name}</p>
                      {candidate.status === "new" && <span className="size-1.5 flex-none rounded-full bg-blue-500 ring-4 ring-blue-50" />}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{candidate.email || candidate.phone || "—"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${CANDIDATE_STATUS_CONFIG[candidate.status].badgeClass}`}>{translateCandidateStatus(candidate.status, language)}</span>
                      <span className="text-[10px] font-semibold text-muted-foreground">{candidate.appliedAt}</span>
                    </div>
                  </div>
                  <ChevronRight size={15} className="flex-none text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-7 py-10 text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary/70 ring-8 ring-pink-50/60"><Search size={21} /></div>
              <p className="text-sm font-black text-foreground">{t("admin.noMatchingJobApplicants")}</p>
              <button type="button" onClick={() => setSearch("")} className="mt-2 text-xs font-bold text-primary hover:underline">{t("common.clearFilters")}</button>
            </div>
          )}

          <ListPagination
            currentPage={activePage}
            pageSize={APPLICANTS_PER_PAGE}
            totalItems={filteredCandidates.length}
            onPageChange={setPage}
          />
        </>
      ) : (
        <div className="px-7 py-16 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary/70 ring-8 ring-pink-50/60"><Users size={24} /></div>
          <p className="text-sm font-black text-foreground">{t("admin.noJobApplicants")}</p>
          <p className="mx-auto mt-1.5 max-w-[250px] text-xs leading-relaxed text-muted-foreground">{t("admin.noJobApplicantsHint")}</p>
        </div>
      )}
    </aside>
  );
}
