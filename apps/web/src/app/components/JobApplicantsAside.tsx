import { ChevronRight, Users } from "lucide-react";
import { Link } from "react-router";
import { useData } from "@/app/data";
import { translateCandidateStatus, useLanguage } from "@/app/i18n";
import { CANDIDATE_STATUS_CONFIG } from "@/app/status-config";

export default function JobApplicantsAside({ jobId }: { jobId: string }) {
  const { candidates } = useData();
  const { language, t } = useLanguage();
  const jobCandidates = candidates
    .filter(candidate => candidate.jobId === jobId)
    .sort((left, right) => right.appliedAt.localeCompare(left.appliedAt));

  return (
    <aside className="self-start overflow-hidden rounded-2xl border border-border/80 bg-white shadow-[0_10px_30px_rgba(120,70,86,0.06)] xl:sticky xl:top-20 xl:col-start-2 xl:row-start-1 xl:row-span-2">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-gradient-to-br from-pink-50/90 via-white to-white p-5">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary">{t("admin.applications")}</p>
          <h2 className="flex items-center gap-2 truncate text-lg font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            <Users size={18} className="flex-none text-primary" /> {t("admin.jobApplicants")}
          </h2>
        </div>
        <div className="flex size-11 flex-none items-center justify-center rounded-2xl bg-white text-base font-black text-primary shadow-sm ring-1 ring-border">
          {jobCandidates.length}
        </div>
      </div>

      {jobCandidates.length > 0 ? (
        <div className="max-h-[calc(100vh-190px)] divide-y divide-border overflow-y-auto">
          {jobCandidates.map(candidate => (
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
                  <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-black text-primary">{candidate.aiScore}% AI</span>
                </div>
              </div>
              <ChevronRight size={15} className="flex-none text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          ))}
        </div>
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
