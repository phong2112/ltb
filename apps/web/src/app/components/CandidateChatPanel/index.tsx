import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { CandidateMessageChannel } from "@/app/data";
import { useData } from "@/app/data";
import {
  CandidateList,
  ChannelSelector,
  ConversationHeader,
  EmptyConversationState,
  MessageComposer,
  MessageList,
} from "./components";
import {
  CANDIDATE_BATCH_SIZE,
  CHANNELS,
  WIDGET_ACTIVE_CANDIDATE_KEY,
  WIDGET_DRAFT_KEY,
  WIDGET_SEARCH_KEY,
  WIDGET_CHANNEL_KEY,
} from "./constants";
import type { CandidateChatPanelProps } from "./types";
import { readStorage, readStoredChannel, writeStorage } from "./utils";

export default function CandidateChatPanel({ initialCandidateId, mode = "full" }: CandidateChatPanelProps) {
  const isWidget = mode === "widget";
  const { candidates, sendCandidateMessage } = useData();
  const [activeCandidateId, setActiveCandidateId] = useState(() => initialCandidateId ?? (isWidget ? readStorage(WIDGET_ACTIVE_CANDIDATE_KEY) : ""));
  const [mobileConversationOpen, setMobileConversationOpen] = useState(Boolean(initialCandidateId));
  const [search, setSearch] = useState(() => isWidget ? readStorage(WIDGET_SEARCH_KEY) : "");
  const [channel, setChannel] = useState<CandidateMessageChannel>(() => isWidget ? readStoredChannel() : "system");
  const [draft, setDraft] = useState(() => isWidget ? readStorage(WIDGET_DRAFT_KEY) : "");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [visibleCandidateCount, setVisibleCandidateCount] = useState(CANDIDATE_BATCH_SIZE);
  const candidateListRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialCandidateId) setActiveCandidateId(initialCandidateId);
  }, [initialCandidateId]);

  useEffect(() => {
    if (!activeCandidateId && candidates[0]) setActiveCandidateId(candidates[0].id);
  }, [activeCandidateId, candidates]);

  useEffect(() => {
    if (!isWidget) return;
    writeStorage(WIDGET_ACTIVE_CANDIDATE_KEY, activeCandidateId);
  }, [activeCandidateId, isWidget]);

  useEffect(() => {
    if (!isWidget) return;
    writeStorage(WIDGET_SEARCH_KEY, search);
  }, [isWidget, search]);

  useEffect(() => {
    if (!isWidget) return;
    writeStorage(WIDGET_CHANNEL_KEY, channel);
  }, [channel, isWidget]);

  useEffect(() => {
    if (!isWidget) return;
    writeStorage(WIDGET_DRAFT_KEY, draft);
  }, [draft, isWidget]);

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((candidate) =>
      [candidate.name, candidate.email, candidate.phone, candidate.jobTitle].some((value) => value.toLowerCase().includes(q)),
    );
  }, [candidates, search]);

  const visibleCandidates = filteredCandidates.slice(0, visibleCandidateCount);
  const hasMoreCandidates = visibleCandidateCount < filteredCandidates.length;

  useEffect(() => {
    setVisibleCandidateCount(CANDIDATE_BATCH_SIZE);
    candidateListRef.current?.scrollTo({ top: 0 });
  }, [search]);

  useEffect(() => {
    const list = candidateListRef.current;
    const sentinel = loadMoreRef.current;
    if (!list || !sentinel || !hasMoreCandidates) return;

    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      setVisibleCandidateCount((current) => Math.min(current + CANDIDATE_BATCH_SIZE, filteredCandidates.length));
    }, {
      root: list,
      rootMargin: "0px 0px 160px",
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredCandidates.length, hasMoreCandidates]);

  const activeCandidate = candidates.find((candidate) => candidate.id === activeCandidateId) ?? filteredCandidates[0] ?? candidates[0];
  const activeChannel = CHANNELS.find((item) => item.value === channel) ?? CHANNELS[0];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!activeCandidate || !draft.trim()) return;

    try {
      setIsSending(true);
      await sendCandidateMessage(activeCandidate.applicationId, channel, draft.trim());
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gửi được tin nhắn");
    } finally {
      setIsSending(false);
    }
  }

  function openCandidate(candidateId: string) {
    setActiveCandidateId(candidateId);
    if (!isWidget) setMobileConversationOpen(true);
  }

  if (candidates.length === 0) return <EmptyConversationState />;

  return (
    <div className={`overflow-hidden bg-white ${isWidget ? "h-full" : "h-[calc(100dvh-8.5rem)] min-h-[480px] rounded-2xl border border-border sm:min-h-[560px] lg:h-[calc(100dvh-9rem)] lg:min-h-[620px]"}`}>
      <div className={isWidget ? "grid h-full min-h-0 grid-cols-[250px_minmax(0,1fr)]" : "grid h-full grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)]"}>
        <CandidateList
          activeCandidate={activeCandidate}
          candidates={visibleCandidates}
          filteredCandidateCount={filteredCandidates.length}
          hasMoreCandidates={hasMoreCandidates}
          isWidget={isWidget}
          listRef={candidateListRef}
          loadMoreRef={loadMoreRef}
          mobileConversationOpen={mobileConversationOpen}
          search={search}
          onOpenCandidate={openCandidate}
          onSearchChange={setSearch}
        />

        <section className={`${!isWidget && !mobileConversationOpen ? "hidden md:flex" : "flex"} min-h-0 flex-col`}>
          {activeCandidate ? (
            <>
              <ConversationHeader candidate={activeCandidate} isWidget={isWidget} onBack={() => setMobileConversationOpen(false)} />
              <ChannelSelector channel={channel} isWidget={isWidget} onChange={setChannel} />
              <MessageList candidate={activeCandidate} isWidget={isWidget} />
              <MessageComposer
                activeChannel={activeChannel}
                draft={draft}
                error={error}
                isSending={isSending}
                isWidget={isWidget}
                onDraftChange={setDraft}
                onSubmit={handleSubmit}
              />
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}

