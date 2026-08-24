import { LoaderCircle, Search } from "lucide-react";
import type { CandidateListProps } from "@/app/components/CandidateChatPanel/types";
import { formatCandidateName, formatTime, getLastMessage } from "@/app/components/CandidateChatPanel/utils";

export function CandidateList({
  activeCandidate,
  candidates,
  filteredCandidateCount,
  hasMoreCandidates,
  isWidget,
  listRef,
  loadMoreRef,
  mobileConversationOpen,
  search,
  onOpenCandidate,
  onSearchChange,
}: CandidateListProps) {
  return (
    <aside className={`${!isWidget && mobileConversationOpen ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-border bg-white`}>
      <div className={`${isWidget ? "p-3" : "p-4"} border-b border-border`}>
        <div className="flex items-center gap-2 bg-background rounded-xl px-3 py-2 border border-border">
          <Search size={14} className="text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={isWidget ? "Tìm ứng viên..." : "Tìm ứng viên, email, vị trí..."}
            className="min-w-0 flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto">
        {candidates.map((candidate) => {
          const lastMessage = getLastMessage(candidate);
          const active = activeCandidate?.id === candidate.id;
          const candidateName = formatCandidateName(candidate.name);

          return (
            <button
              key={candidate.id}
              type="button"
              onClick={() => onOpenCandidate(candidate.id)}
              className={`w-full text-left ${isWidget ? "p-3" : "p-4"} border-b border-border transition-colors ${active ? "bg-pink-50" : "hover:bg-pink-50/60"}`}
            >
              <div className="flex items-start gap-3">
                <div className={`${isWidget ? "h-9 w-9" : "h-10 w-10"} rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-black flex-shrink-0`}>
                  {candidateName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-black text-foreground">{candidateName}</p>
                    <span className={`${isWidget ? "hidden" : "block"} text-[10px] font-bold text-muted-foreground flex-shrink-0`}>
                      {lastMessage ? formatTime(lastMessage.createdAt) : candidate.appliedAt}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{candidate.jobTitle}</p>
                  <p className="truncate text-xs text-muted-foreground mt-1">{lastMessage?.content ?? "Chưa có tin nhắn"}</p>
                </div>
              </div>
            </button>
          );
        })}
        {filteredCandidateCount === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Không tìm thấy ứng viên phù hợp.
          </div>
        )}
        {hasMoreCandidates && (
          <div
            ref={loadMoreRef}
            role="status"
            className="flex items-center justify-center gap-2 px-4 py-3 text-xs text-muted-foreground"
          >
            <LoaderCircle size={14} className="animate-spin" />
            Đang tải thêm ứng viên...
          </div>
        )}
      </div>
    </aside>
  );
}

