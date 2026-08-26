import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Ban, CheckCircle2, ChevronDown, MessageCircle, RefreshCw, Search, Send, UserRound } from "lucide-react";
import { Link } from "react-router";
import type {
  ApiAdminChatConversation,
  ApiChatConversation,
  ApiChatMessage,
  ChatConversationStatus,
} from "@/app/apis/models/chat";
import {
  createAdminChatRealtimeTicket,
  getAdminChatConversation,
  listAdminChatConversations,
  markAdminChatRead,
  sendAdminChatMessage,
  updateAdminChatStatus,
} from "@/app/apis/requests";
import { connectChatRealtime } from "@/app/services/chat-realtime";

type Props = { initialApplicationId?: string | null };

export default function SystemChatInbox({ initialApplicationId }: Props) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [conversations, setConversations] = useState<ApiAdminChatConversation[]>([]);
  const [listCursor, setListCursor] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ApiChatConversation | null>(null);
  const [messages, setMessages] = useState<ApiChatMessage[]>([]);
  const [messageCursor, setMessageCursor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [error, setError] = useState("");
  const messageEndRef = useRef<HTMLDivElement>(null);
  const pendingMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const loadList = useCallback(async (append = false) => {
    if (!append) setLoadingList(true);
    try {
      const page = await listAdminChatConversations({
        q: debouncedQuery || undefined,
        cursor: append ? listCursor ?? undefined : undefined,
      });
      setConversations(current => append ? dedupeConversations([...current, ...page.items]) : page.items);
      setListCursor(page.nextCursor);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải danh sách chat.");
    } finally {
      setLoadingList(false);
    }
  }, [debouncedQuery, listCursor]);

  useEffect(() => {
    void loadList();
  }, [debouncedQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!conversations.length || selectedId) return;
    const requested = initialApplicationId
      ? conversations.find(item => item.applicationId === initialApplicationId || item.candidateId === initialApplicationId)
      : undefined;
    setSelectedId(requested?.id ?? conversations[0].id);
  }, [conversations, initialApplicationId, selectedId]);

  const loadChat = useCallback(async (showLoading = false) => {
    if (!selectedId) return;
    if (showLoading) setLoadingChat(true);
    try {
      const detail = await getAdminChatConversation(selectedId);
      setConversation(detail.conversation);
      setMessages(detail.items);
      setMessageCursor(detail.nextCursor);
      setError("");
      void markAdminChatRead(selectedId);
      setConversations(current => current.map(item => item.id === selectedId ? { ...item, _count: { messages: 0 } } : item));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải cuộc trò chuyện.");
    } finally {
      if (showLoading) setLoadingChat(false);
    }
  }, [selectedId]);

  useEffect(() => {
    setConversation(null);
    setMessages([]);
    if (!selectedId) return;
    void loadChat(true);
  }, [loadChat, selectedId]);

  const selectedIdRef = useRef(selectedId);
  const loadListRef = useRef(loadList);
  const loadChatRef = useRef(loadChat);

  useEffect(() => {
    selectedIdRef.current = selectedId;
    loadListRef.current = loadList;
    loadChatRef.current = loadChat;
  }, [loadChat, loadList, selectedId]);

  useEffect(() => {
    const realtime = connectChatRealtime({
      getTicket: createAdminChatRealtimeTicket,
      onReady: () => {
        void loadListRef.current();
        if (selectedIdRef.current) void loadChatRef.current();
      },
      onMessage: event => {
        if (event.conversationId === selectedIdRef.current) {
          setMessages(current => dedupeMessages([...current, event.message]));
          if (event.message.senderType === "GUEST") {
            void markAdminChatRead(event.conversationId).catch(() => undefined);
          }
        }
        void loadListRef.current();
      },
      onConversation: event => {
        setConversations(current => current.map(item => item.id === event.conversationId ? {
          ...item,
          status: event.status,
          lastMessageAt: event.lastMessageAt,
        } : item));
        setConversation(current => current?.id === event.conversationId ? {
          ...current,
          status: event.status,
          lastMessageAt: event.lastMessageAt,
        } : current);
      },
      onConnectionChange: setRealtimeConnected,
    });
    return () => realtime.close();
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      void loadListRef.current();
      if (selectedIdRef.current) void loadChatRef.current();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedId]);

  const selectedListItem = useMemo(
    () => conversations.find(item => item.id === selectedId),
    [conversations, selectedId],
  );

  async function loadOlderMessages() {
    if (!selectedId || !messageCursor) return;
    try {
      const detail = await getAdminChatConversation(selectedId, messageCursor);
      setMessages(current => dedupeMessages([...detail.items, ...current]));
      setMessageCursor(detail.nextCursor);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải tin nhắn cũ.");
    }
  }

  async function sendMessage() {
    const content = draft.trim();
    if (!selectedId || !content || sending) return;
    setSending(true);
    try {
      const clientMessageId = pendingMessageIdRef.current ?? crypto.randomUUID();
      pendingMessageIdRef.current = clientMessageId;
      const sent = await sendAdminChatMessage(selectedId, { content, clientMessageId });
      setMessages(current => dedupeMessages([...current, sent]));
      pendingMessageIdRef.current = null;
      setDraft("");
      await loadList();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể gửi tin nhắn.");
    } finally {
      setSending(false);
    }
  }

  async function setStatus(status: ChatConversationStatus) {
    if (!selectedId) return;
    try {
      const updated = await updateAdminChatStatus(selectedId, status);
      setConversation(updated);
      setConversations(current => current.map(item => item.id === selectedId ? { ...item, status } : item));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể cập nhật trạng thái.");
    }
  }

  return (
    <div className="min-h-[620px] overflow-hidden rounded-2xl border border-border bg-white shadow-sm lg:grid lg:h-[calc(100vh-190px)] lg:min-h-[620px] lg:grid-cols-[350px_minmax(0,1fr)]">
      <aside className={`${selectedId ? "hidden lg:flex" : "flex"} min-h-[620px] flex-col border-r border-border bg-white`}>
        <div className="border-b border-border p-4">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
            <span className="sr-only">Tìm hội thoại</span>
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tên, email hoặc số điện thoại" className="h-11 w-full rounded-xl border border-border bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
          </label>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingList && conversations.length === 0 ? (
            <p className="flex items-center justify-center p-10 text-sm text-muted-foreground"><RefreshCw className="mr-2 animate-spin" size={16} /> Đang tải…</p>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground"><MessageCircle className="mx-auto mb-3 text-primary" size={26} /><p className="font-bold text-foreground">Chưa có hội thoại</p><p className="mt-1">Tin nhắn từ career site sẽ xuất hiện tại đây.</p></div>
          ) : conversations.map(item => {
            const latest = item.messages[0];
            const active = item.id === selectedId;
            return (
              <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`w-full border-b border-border px-4 py-4 text-left transition-colors ${active ? "bg-primary/8" : "hover:bg-slate-50"}`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary/10 font-black text-primary"><UserRound size={19} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-black text-foreground">{displayName(item)}</span><span className="flex-none text-[10px] text-muted-foreground">{formatListTime(item.lastMessageAt)}</span></span>
                    <span className="mt-0.5 block truncate text-xs font-semibold text-primary">{item.application?.job?.title ?? "Khách career site"}</span>
                    <span className="mt-1 flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{latest?.senderType === "TA" ? "Bạn: " : ""}{latest?.content}</span>{item._count.messages > 0 && <span className="min-w-5 rounded-full bg-primary px-1.5 py-0.5 text-center text-[10px] font-black text-white">{item._count.messages}</span>}</span>
                  </span>
                </div>
              </button>
            );
          })}
          {listCursor && <button type="button" onClick={() => void loadList(true)} className="flex w-full items-center justify-center gap-1 p-3 text-xs font-bold text-primary hover:bg-primary/5">Xem thêm <ChevronDown size={14} /></button>}
        </div>
      </aside>

      <main className={`${selectedId ? "flex" : "hidden lg:flex"} min-h-[620px] min-w-0 flex-col bg-slate-50`}>
        {!selectedId ? (
          <div className="m-auto text-center text-muted-foreground"><MessageCircle className="mx-auto mb-3 text-primary/50" size={42} /><p className="font-bold">Chọn một hội thoại để bắt đầu</p></div>
        ) : (
          <>
            <header className="flex min-h-[72px] items-center justify-between gap-3 border-b border-border bg-white px-4">
              <div className="flex min-w-0 items-center gap-2">
                <button type="button" onClick={() => setSelectedId(null)} className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" aria-label="Quay lại danh sách"><ArrowLeft size={19} /></button>
                <div className="min-w-0"><p className="truncate font-black text-foreground">{displayName(conversation ?? selectedListItem)}</p><p className="truncate text-xs text-muted-foreground">{conversation?.application?.job?.title ?? selectedListItem?.application?.job?.title ?? "Khách career site"} · {realtimeConnected ? "Realtime" : "Đang kết nối lại"}</p></div>
              </div>
              <div className="flex flex-none items-center gap-1.5">
                {conversation?.candidateId && <Link to={`/admin/candidates/${conversation.candidateId}${conversation.applicationId ? `?application=${conversation.applicationId}` : ""}`} className="hidden rounded-lg border border-border px-3 py-2 text-xs font-bold hover:border-primary hover:text-primary sm:block">Xem hồ sơ</Link>}
                {conversation?.status === "BLOCKED" ? <button type="button" onClick={() => void setStatus("OPEN")} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Bỏ chặn</button> : <button type="button" onClick={() => void setStatus("BLOCKED")} className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-700" title="Chặn"><Ban size={18} /></button>}
                {conversation?.status === "CLOSED" ? <button type="button" onClick={() => void setStatus("OPEN")} className="rounded-lg bg-primary/10 px-3 py-2 text-xs font-bold text-primary">Mở lại</button> : conversation?.status !== "BLOCKED" && <button type="button" onClick={() => void setStatus("CLOSED")} className="rounded-lg p-2 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700" title="Đóng hội thoại"><CheckCircle2 size={18} /></button>}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              {loadingChat ? <p className="flex h-full items-center justify-center text-sm text-muted-foreground"><RefreshCw className="mr-2 animate-spin" size={16} /> Đang tải…</p> : (
                <div className="mx-auto max-w-3xl space-y-3">
                  {messageCursor && <button type="button" onClick={() => void loadOlderMessages()} className="mx-auto block rounded-full bg-white px-4 py-2 text-xs font-bold text-primary shadow-sm">Tải tin nhắn cũ</button>}
                  {messages.map(message => {
                    const fromTa = message.senderType === "TA";
                    return <div key={message.id} className={`flex ${fromTa ? "justify-end" : "justify-start"}`}><div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-5 shadow-sm ${fromTa ? "rounded-br-md bg-primary text-white" : "rounded-bl-md border border-border bg-white text-foreground"}`}><p className="whitespace-pre-wrap break-words">{message.content}</p><p className={`mt-1 text-[10px] ${fromTa ? "text-white/70" : "text-muted-foreground"}`}>{formatMessageTime(message.createdAt)}</p></div></div>;
                  })}
                  <div ref={messageEndRef} />
                </div>
              )}
            </div>

            <footer className="border-t border-border bg-white p-3 sm:p-4">
              {error && <p className="mx-auto mb-2 max-w-3xl rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
              {conversation?.status === "BLOCKED" ? <p className="mx-auto max-w-3xl rounded-xl bg-slate-100 p-3 text-center text-sm text-muted-foreground">Hội thoại đang bị chặn.</p> : (
                <div className="mx-auto flex max-w-3xl items-end gap-2">
                  <textarea value={draft} onChange={event => { pendingMessageIdRef.current = null; setDraft(event.target.value.slice(0, 2000)); }} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} rows={1} maxLength={2000} placeholder={conversation?.status === "CLOSED" ? "Gửi tin nhắn sẽ tiếp tục hội thoại…" : "Nhập phản hồi…"} className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-border px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" aria-label="Nội dung phản hồi" />
                  <button type="button" onClick={() => void sendMessage()} disabled={!draft.trim() || sending} className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-primary text-white disabled:opacity-45" aria-label="Gửi phản hồi">{sending ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}</button>
                </div>
              )}
            </footer>
          </>
        )}
      </main>
    </div>
  );
}

function displayName(conversation?: Pick<ApiChatConversation, "id" | "candidate"> | null) {
  return conversation?.candidate?.fullName ?? (conversation ? `Khách ${conversation.id.slice(-6).toUpperCase()}` : "Khách career site");
}

function dedupeConversations(items: ApiAdminChatConversation[]) {
  return [...new Map(items.map(item => [item.id, item])).values()];
}

function dedupeMessages(items: ApiChatMessage[]) {
  return [...new Map(items.map(item => [item.id, item])).values()];
}

function formatListTime(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(new Date(value));
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(value));
}
