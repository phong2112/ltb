import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Minus, RefreshCw, RotateCcw, Send, X } from "lucide-react";
import type { ApiChatMessage, ApiGuestChatConversation } from "@/app/apis/models/chat";
import {
  ApiRequestError,
  createGuestChatRealtimeTicket,
  createGuestChatSession,
  getGuestChatSnapshot,
  markGuestChatRead,
  resetGuestChatSession,
  restoreGuestChatSession,
  sendGuestChatMessage,
} from "@/app/apis/requests";
import { connectChatRealtime, type ChatRealtimeConnection } from "@/app/services/chat-realtime";

const RECOVERY_KEY = "candidate_chat_recovery_token";
const DRAFT_KEY = "candidate_chat_draft";

export default function GuestChatWidget() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const [conversation, setConversation] = useState<ApiGuestChatConversation | null>(null);
  const [messages, setMessages] = useState<ApiChatMessage[]>([]);
  const [draft, setDraft] = useState(() => readStorage(DRAFT_KEY));
  const [error, setError] = useState("");
  const messageEndRef = useRef<HTMLDivElement>(null);
  const pendingMessageIdRef = useRef<string | null>(null);
  const recoveryTokenRef = useRef(readStorage(RECOVERY_KEY));

  const saveRecoveryToken = useCallback((token: string) => {
    recoveryTokenRef.current = token;
    writeStorage(RECOVERY_KEY, token);
  }, []);

  const ensureSession = useCallback(async () => {
    const recoveryToken = recoveryTokenRef.current;
    if (!recoveryToken) {
      const created = await createGuestChatSession();
      saveRecoveryToken(created.recoveryToken);
      return undefined;
    }

    try {
      return await getGuestChatSnapshot();
    } catch (requestError) {
      if (!(requestError instanceof ApiRequestError) || requestError.status !== 401) throw requestError;
    }

    if (recoveryToken) {
      try {
        const restored = await restoreGuestChatSession(recoveryToken);
        saveRecoveryToken(restored.recoveryToken);
        return undefined;
      } catch (requestError) {
        if (!(requestError instanceof ApiRequestError) || requestError.status !== 401) throw requestError;
      }
    }

    const created = await createGuestChatSession();
    saveRecoveryToken(created.recoveryToken);
    return undefined;
  }, [saveRecoveryToken]);

  const loadConversation = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const existingSnapshot = await ensureSession();
      const snapshot = existingSnapshot ?? await getGuestChatSnapshot();
      setConversation(snapshot.conversation);
      setMessages(snapshot.messages.items);
      setReady(true);
      setError("");
      if (snapshot.messages.items.some(message => message.senderType === "TA" && !message.readAt)) {
        void markGuestChatRead().catch(() => undefined);
      }
    } catch (requestError) {
      setError(describeChatError(requestError, "Không thể tải cuộc trò chuyện."));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [ensureSession]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let realtime: ChatRealtimeConnection | undefined;

    void loadConversation(true).then(() => {
      if (cancelled) return;
      realtime = connectChatRealtime({
        getTicket: async () => {
          try {
            return await createGuestChatRealtimeTicket();
          } catch (requestError) {
            if (!(requestError instanceof ApiRequestError) || requestError.status !== 401) throw requestError;
            await ensureSession();
            return createGuestChatRealtimeTicket();
          }
        },
        onReady: () => void loadConversation(),
        onMessage: event => {
          setMessages(current => dedupeMessages([...current, event.message]));
          if (event.message.senderType === "TA" && !event.message.readAt) {
            void markGuestChatRead().catch(() => undefined);
          }
        },
        onConversation: event => {
          setConversation(current => current ? {
            ...current,
            status: event.status,
            lastMessageAt: event.lastMessageAt,
          } : current);
        },
        onConnectionChange: setRealtimeConnected,
      });
    });

    return () => {
      cancelled = true;
      realtime?.close();
      setRealtimeConnected(false);
    };
  }, [ensureSession, loadConversation, open, sessionEpoch]);

  useEffect(() => {
    if (!open) return;
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void loadConversation();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [loadConversation, open]);

  useEffect(() => {
    if (open) messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (draft) writeStorage(DRAFT_KEY, draft);
    else removeStorage(DRAFT_KEY);
  }, [draft]);

  async function sendMessage() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setError("");
    try {
      const clientMessageId = pendingMessageIdRef.current ?? crypto.randomUUID();
      pendingMessageIdRef.current = clientMessageId;
      try {
        const sent = await sendGuestChatMessage({ content, clientMessageId });
        setMessages(current => dedupeMessages([...current, sent]));
      } catch (requestError) {
        if (!(requestError instanceof ApiRequestError) || requestError.status !== 401) {
          throw requestError;
        }
        await ensureSession();
        const sent = await sendGuestChatMessage({ content, clientMessageId });
        setMessages(current => dedupeMessages([...current, sent]));
      }
      pendingMessageIdRef.current = null;
      setDraft("");
      removeStorage(DRAFT_KEY);
    } catch (requestError) {
      setError(describeChatError(requestError, "Không thể gửi tin nhắn."));
    } finally {
      setSending(false);
    }
  }

  async function startNewConversation() {
    if (!window.confirm("Bắt đầu cuộc trò chuyện mới? Lịch sử cũ vẫn được lưu nhưng trình duyệt này sẽ không còn mở lại được.")) return;
    setLoading(true);
    try {
      const created = await resetGuestChatSession();
      saveRecoveryToken(created.recoveryToken);
      setConversation(null);
      setMessages([]);
      setDraft("");
      pendingMessageIdRef.current = null;
      removeStorage(DRAFT_KEY);
      setError("");
      setReady(true);
      setSessionEpoch(current => current + 1);
    } catch (requestError) {
      setError(describeChatError(requestError, "Không thể tạo cuộc trò chuyện mới."));
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-4 z-50 flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-sm font-black text-white shadow-xl transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 sm:bottom-6 sm:right-6"
        aria-label="Mở chat với tư vấn tuyển dụng"
      >
        <MessageCircle size={21} aria-hidden="true" />
        <span>Chat với TA</span>
      </button>
    );
  }

  const blocked = conversation?.status === "BLOCKED";

  return (
    <section
      className="fixed inset-0 z-50 flex flex-col bg-white shadow-2xl sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(650px,calc(100vh-3rem))] sm:w-[390px] sm:overflow-hidden sm:rounded-3xl sm:border sm:border-border"
      aria-label="Chat với tư vấn tuyển dụng"
    >
      <header className="flex min-h-16 items-center justify-between bg-primary px-4 text-white">
        <div className="min-w-0">
          <p className="font-black">Tư vấn tuyển dụng</p>
          <p className="truncate text-xs text-white/80">{realtimeConnected ? "Đang kết nối realtime" : "Đang kết nối lại…"}</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => void startNewConversation()} className="rounded-full p-2 hover:bg-white/15" title="Bắt đầu chat mới" aria-label="Bắt đầu chat mới">
            <RotateCcw size={17} />
          </button>
          <button type="button" onClick={() => setOpen(false)} className="hidden rounded-full p-2 hover:bg-white/15 sm:block" aria-label="Thu nhỏ chat">
            <Minus size={19} />
          </button>
          <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/15 sm:hidden" aria-label="Đóng chat">
            <X size={19} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4" aria-live="polite">
        {loading && !ready ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <RefreshCw className="mr-2 animate-spin" size={17} /> Đang mở cuộc trò chuyện…
          </div>
        ) : messages.length === 0 ? (
          <div className="mx-auto mt-10 max-w-xs rounded-2xl border border-border bg-white p-5 text-center shadow-sm">
            <MessageCircle className="mx-auto mb-3 text-primary" size={28} />
            <p className="font-black text-foreground">Xin chào!</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Bạn có thể hỏi trực tiếp về vị trí tuyển dụng hoặc quá trình ứng tuyển. Không cần đăng nhập.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map(message => {
              const fromGuest = message.senderType === "GUEST";
              return (
                <div key={message.id} className={`flex ${fromGuest ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-5 shadow-sm ${fromGuest ? "rounded-br-md bg-primary text-white" : "rounded-bl-md border border-border bg-white text-foreground"}`}>
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    <p className={`mt-1 text-[10px] ${fromGuest ? "text-white/70" : "text-muted-foreground"}`}>{formatMessageTime(message.createdAt)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messageEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-border bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
        {blocked ? (
          <p className="rounded-xl bg-slate-100 px-3 py-3 text-center text-sm text-muted-foreground">Cuộc trò chuyện này hiện không nhận thêm tin nhắn.</p>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={event => {
                pendingMessageIdRef.current = null;
                setDraft(event.target.value.slice(0, 2000));
              }}
              onKeyDown={event => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder="Nhập tin nhắn…"
              className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-white px-3.5 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              aria-label="Nội dung tin nhắn"
            />
            <button type="button" onClick={() => void sendMessage()} disabled={!draft.trim() || sending} className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-primary text-white disabled:cursor-not-allowed disabled:opacity-45" aria-label="Gửi tin nhắn">
              {sending ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
            </button>
          </div>
        )}
        <p className="mt-2 text-center text-[10px] text-muted-foreground">Phiên chat được giữ trên trình duyệt này. Xóa toàn bộ dữ liệu trang sẽ mất quyền mở lại lịch sử.</p>
      </div>
    </section>
  );
}

function dedupeMessages(items: ApiChatMessage[]) {
  return [...new Map(items.map(item => [item.id, item])).values()];
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(value));
}

function describeChatError(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError && error.status === 429) {
    return "Bạn thao tác quá nhanh. Vui lòng chờ một phút rồi thử lại.";
  }
  return error instanceof Error ? error.message : fallback;
}

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // The HttpOnly cookie still supports the active session when browser storage is unavailable.
  }
}

function removeStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to clear when browser storage is unavailable.
  }
}
