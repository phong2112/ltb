import type { Candidate, CandidateMessageChannel } from "@/app/data";

export type CandidateChatPanelProps = {
  initialCandidateId?: string | null;
  mode?: "full" | "widget";
};

export type ChannelOption = {
  value: CandidateMessageChannel;
  label: string;
  status: string;
  icon: React.ReactNode;
};

export type CandidateListProps = {
  activeCandidate?: Candidate;
  candidates: Candidate[];
  filteredCandidateCount: number;
  hasMoreCandidates: boolean;
  isWidget: boolean;
  listRef: React.RefObject<HTMLDivElement | null>;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
  mobileConversationOpen: boolean;
  search: string;
  onOpenCandidate: (candidateId: string) => void;
  onSearchChange: (value: string) => void;
};

