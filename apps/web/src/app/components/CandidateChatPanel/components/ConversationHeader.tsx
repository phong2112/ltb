import { Link } from "react-router";
import { ArrowLeft, Briefcase, Mail, Phone, UserRound } from "lucide-react";
import type { Candidate } from "@/app/data";
import { formatCandidateName } from "@/app/components/CandidateChatPanel/utils";

type ConversationHeaderProps = {
  candidate: Candidate;
  isWidget: boolean;
  onBack: () => void;
};

export function ConversationHeader({ candidate, isWidget, onBack }: ConversationHeaderProps) {
  const candidateName = formatCandidateName(candidate.name);

  return (
    <header className={`border-b border-border ${isWidget ? "p-3" : "p-4"}`}>
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        {!isWidget && (
          <button type="button" onClick={onBack} className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-border text-muted-foreground md:hidden" aria-label="Quay lại danh sách ứng viên">
            <ArrowLeft size={16} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-black flex-shrink-0">
              {candidateName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-foreground">{candidateName}</p>
              <p className="truncate text-xs text-muted-foreground">{candidate.jobTitle}</p>
            </div>
          </div>
        </div>
        <Link
          to={`/admin/candidates/${candidate.candidateId}?application=${candidate.applicationId}`}
          className="inline-flex h-9 flex-none items-center gap-1.5 rounded-xl border border-border px-2.5 text-xs font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary sm:px-3"
        >
          <UserRound size={13} /> <span className="hidden min-[390px]:inline">Hồ sơ</span>
        </Link>
      </div>

      <div className={`${isWidget ? "hidden" : "mt-3 flex"} flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground`}>
        <span className="flex min-w-0 max-w-full items-center gap-1.5 sm:max-w-[240px]"><Mail size={12} className="flex-shrink-0" /> <span className="truncate">{candidate.email || "Chưa có email"}</span></span>
        <span className="flex min-w-0 max-w-full items-center gap-1.5 sm:max-w-[160px]"><Phone size={12} className="flex-shrink-0" /> <span className="truncate">{candidate.phone || "Chưa có SĐT"}</span></span>
        <span className="flex min-w-0 max-w-full items-center gap-1.5 sm:max-w-[160px]"><Briefcase size={12} className="flex-shrink-0" /> <span className="truncate">{candidate.status}</span></span>
      </div>
    </header>
  );
}

