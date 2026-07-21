import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import {
  Briefcase,
  Clock,
  Linkedin,
  LoaderCircle,
  Mail,
  MessageCircle,
  MessagesSquare,
  Phone,
  Search,
  Send,
  Smartphone,
  UserRound,
} from "lucide-react";
import { Candidate, CandidateMessageChannel, useData } from "@/app/data";

type CandidateChatPanelProps = {
  initialCandidateId?: string | null;
  mode?: "full" | "widget";
};

const CHANNELS: { value: CandidateMessageChannel; label: string; status: string; icon: ReactNode }[] = [
  { value: "system", label: "Hệ thống", status: "Nội bộ", icon: <MessagesSquare size={14} /> },
  { value: "messenger", label: "Messenger", status: "Chờ API", icon: <MessageCircle size={14} /> },
  { value: "zalo", label: "Zalo", status: "Chờ API", icon: <Smartphone size={14} /> },
  { value: "email", label: "Email", status: "Có thể nối SMTP/API", icon: <Mail size={14} /> },
  { value: "linkedin", label: "LinkedIn", status: "Ghi nhận thủ công", icon: <Linkedin size={14} /> },
];

const WIDGET_ACTIVE_CANDIDATE_KEY = "hr-copilot-chat-widget-active-candidate";
const WIDGET_SEARCH_KEY = "hr-copilot-chat-widget-search";
const WIDGET_CHANNEL_KEY = "hr-copilot-chat-widget-channel";
const WIDGET_DRAFT_KEY = "hr-copilot-chat-widget-draft";
const CANDIDATE_BATCH_SIZE = 20;

export default function CandidateChatPanel({ initialCandidateId, mode = "full" }: CandidateChatPanelProps) {
  const isWidget = mode === "widget";
  const { candidates, sendCandidateMessage } = useData();
  const [activeCandidateId, setActiveCandidateId] = useState(() => initialCandidateId ?? (isWidget ? readStorage(WIDGET_ACTIVE_CANDIDATE_KEY) : ""));
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

  if (candidates.length === 0) {
    return (
      <div className="bg-white border border-border rounded-2xl p-8 text-center text-muted-foreground">
        <MessageCircle size={32} className="mx-auto mb-3 opacity-40" />
        <p className="font-bold text-foreground">Chưa có ứng viên để chat</p>
        <p className="text-sm mt-1">Khi có hồ sơ mới, hội thoại sẽ xuất hiện tại đây.</p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden bg-white ${isWidget ? "h-full" : "h-[calc(100dvh-10rem)] min-h-[620px] rounded-2xl border border-border"}`}>
      <div className={isWidget ? "grid h-full min-h-0 grid-cols-[250px_minmax(0,1fr)]" : "grid h-full grid-cols-1 grid-rows-[220px_minmax(0,1fr)] md:grid-cols-[300px_minmax(0,1fr)] md:grid-rows-1"}>
        <aside className="flex min-h-0 flex-col border-b border-border bg-white md:border-b-0 md:border-r">
          <div className={`${isWidget ? "p-3" : "p-4"} border-b border-border`}>
            <div className="flex items-center gap-2 bg-background rounded-xl px-3 py-2 border border-border">
              <Search size={14} className="text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={isWidget ? "Tìm ứng viên..." : "Tìm ứng viên, email, vị trí..."}
                className="min-w-0 flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div ref={candidateListRef} className="flex-1 overflow-y-auto">
            {visibleCandidates.map((candidate) => {
              const lastMessage = getLastMessage(candidate);
              const active = activeCandidate?.id === candidate.id;
              const candidateName = formatCandidateName(candidate.name);

              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => setActiveCandidateId(candidate.id)}
                  className={`w-full text-left ${isWidget ? "p-3" : "p-4"} border-b border-border transition-colors ${active ? "bg-pink-50" : "hover:bg-pink-50/60"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`${isWidget ? "h-9 w-9" : "h-10 w-10"} rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-black flex-shrink-0`}>
                      {candidateName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-black text-foreground">{candidateName}</p>
                        <span className={`${isWidget ? "hidden" : "block"} text-[10px] font-bold text-muted-foreground flex-shrink-0`}>{lastMessage ? formatTime(lastMessage.createdAt) : candidate.appliedAt}</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{candidate.jobTitle}</p>
                      <p className="truncate text-xs text-muted-foreground mt-1">{lastMessage?.content ?? "Chưa có tin nhắn"}</p>
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredCandidates.length === 0 && (
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

        <section className="flex min-h-0 flex-col">
          {activeCandidate ? (
            <>
              <header className={`border-b border-border ${isWidget ? "p-3" : "p-4"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-black flex-shrink-0">
                        {formatCandidateName(activeCandidate.name).charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-foreground">{formatCandidateName(activeCandidate.name)}</p>
                        <p className="truncate text-xs text-muted-foreground">{activeCandidate.jobTitle}</p>
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/admin/candidates/${activeCandidate.candidateId}?application=${activeCandidate.applicationId}`}
                    className="inline-flex h-9 flex-none items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <UserRound size={13} /> Hồ sơ
                  </Link>
                </div>

                <div className={`${isWidget ? "hidden" : "mt-3 flex"} flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground`}>
                  <span className="flex min-w-0 max-w-full items-center gap-1.5 sm:max-w-[240px]"><Mail size={12} className="flex-shrink-0" /> <span className="truncate">{activeCandidate.email || "Chưa có email"}</span></span>
                  <span className="flex min-w-0 max-w-full items-center gap-1.5 sm:max-w-[160px]"><Phone size={12} className="flex-shrink-0" /> <span className="truncate">{activeCandidate.phone || "Chưa có SĐT"}</span></span>
                  <span className="flex min-w-0 max-w-full items-center gap-1.5 sm:max-w-[160px]"><Briefcase size={12} className="flex-shrink-0" /> <span className="truncate">{activeCandidate.status}</span></span>
                </div>
              </header>

              <div className={`border-b border-border bg-background/60 ${isWidget ? "p-2" : "p-3"}`}>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {CHANNELS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setChannel(item.value)}
                      className={`flex min-w-max items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-bold transition-colors ${channel === item.value ? "border-primary bg-primary text-white" : "border-border bg-white text-muted-foreground hover:border-primary hover:text-primary"}`}
                    >
                      {item.icon}
                      {item.label}
                      {!isWidget && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${channel === item.value ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>{item.status}</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`flex-1 overflow-y-auto bg-[#fbfaf9] ${isWidget ? "p-3" : "p-4"}`}>
                {activeCandidate.messages.length === 0 ? (
                  <div className="h-full min-h-[220px] flex items-center justify-center text-center text-muted-foreground">
                    <div>
                      <MessageCircle size={30} className="mx-auto mb-3 opacity-40" />
                      <p className="text-sm font-bold text-foreground">Chưa có hội thoại</p>
                      <p className="text-xs mt-1">Gửi tin đầu tiên hoặc ghi nhận trao đổi từ kênh bên ngoài.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeCandidate.messages.map((message) => {
                      const outbound = message.direction === "outbound";
                      return (
                        <div key={message.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                          <div className={`${isWidget ? "max-w-[86%]" : "max-w-[88%] sm:max-w-[78%]"} min-w-0 break-words rounded-2xl px-3 py-2 text-sm shadow-sm ${outbound ? "bg-primary text-white rounded-br-md" : "bg-white border border-border text-foreground rounded-bl-md"}`}>
                            <div className={`mb-1 flex items-center gap-1.5 text-[10px] font-bold ${outbound ? "text-white/80" : "text-muted-foreground"}`}>
                              {iconForChannel(message.channel)}
                              <span>{labelForChannel(message.channel)}</span>
                              <Clock size={10} />
                              <span>{formatTime(message.createdAt)}</span>
                            </div>
                            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="border-t border-border p-3">
                <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-bold">{activeChannel.icon} {activeChannel.label}</span>
                  {!isWidget && <span>{activeChannel.status}</span>}
                </div>
                <div className="flex items-end gap-2">
                  <textarea
                    rows={isWidget ? 2 : 3}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Nhập nội dung trao đổi với ứng viên..."
                    className="min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-input-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || isSending}
                    className="h-11 w-11 flex-shrink-0 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                    aria-label="Gửi tin nhắn"
                  >
                    <Send size={17} />
                  </button>
                </div>
                {error && <p className="mt-2 text-xs font-semibold text-red-500">{error}</p>}
              </form>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function getLastMessage(candidate: Candidate) {
  return candidate.messages[candidate.messages.length - 1];
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function labelForChannel(channel: CandidateMessageChannel) {
  return CHANNELS.find((item) => item.value === channel)?.label ?? "Hệ thống";
}

function iconForChannel(channel: CandidateMessageChannel) {
  return CHANNELS.find((item) => item.value === channel)?.icon ?? <MessagesSquare size={12} />;
}

function formatCandidateName(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toLocaleUpperCase("vi-VN") + part.slice(1))
    .join(" ");
}

function readStorage(key: string) {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) ?? "";
}

function writeStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
}

function readStoredChannel(): CandidateMessageChannel {
  const stored = readStorage(WIDGET_CHANNEL_KEY);
  return CHANNELS.some((item) => item.value === stored) ? stored as CandidateMessageChannel : "system";
}
