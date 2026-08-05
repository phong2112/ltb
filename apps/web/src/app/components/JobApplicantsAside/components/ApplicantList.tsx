import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { translateCandidateStatus } from "@/app/services/i18n-service";
import { CANDIDATE_STATUS_CONFIG } from "@/app/utils/configs/status-config";
import { appendReturnTo } from "@/app/utils/navigation";
import type { ApplicantListProps } from "../types";

export function ApplicantList({ candidates, language, returnTo }: ApplicantListProps) {
  return (
    <div className="max-h-[clamp(16rem,calc(100vh-22rem),35rem)] divide-y divide-border overflow-y-auto">
      {candidates.map((candidate) => (
        <Link
          key={candidate.applicationId}
          to={appendReturnTo(`/admin/candidates/${candidate.candidateId}?application=${candidate.applicationId}`, returnTo)}
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
              <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-black text-primary">
                {candidate.aiStatus === "completed" ? `${candidate.aiScore}% AI` : candidate.aiStatus === "pending" ? "AI đang xử lý" : "AI lỗi"}
              </span>
            </div>
          </div>
          <ChevronRight size={15} className="flex-none text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>
      ))}
    </div>
  );
}
