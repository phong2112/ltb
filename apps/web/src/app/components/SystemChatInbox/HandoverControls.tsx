import { Bot, LogIn, LogOut } from "lucide-react";
import type { ApiChatConversation } from "@/app/apis/models/chat";

type Props = {
  conversation: Pick<ApiChatConversation, "mode" | "status" | "handoffRequestedAt">;
  busy: boolean;
  onJoin: () => void;
  onLeave: () => void;
};

/** TA takes a conversation from the bot (join) or hands it back (leave). */
export default function HandoverControls({ conversation, busy, onJoin, onLeave }: Props) {
  if (conversation.status === "BLOCKED") return null;

  return (
    <div className="flex items-center gap-1.5">
      {conversation.handoffRequestedAt && conversation.mode === "BOT" && (
        <span className="hidden rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-800 sm:inline">Cần TA</span>
      )}
      {conversation.mode === "HUMAN" ? (
        <button type="button" disabled={busy} onClick={onLeave} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-bold hover:border-primary hover:text-primary disabled:opacity-45" title="Rời hội thoại và bật lại bot">
          <LogOut size={14} aria-hidden="true" /> Rời & bật bot
        </button>
      ) : (
        <button type="button" disabled={busy} onClick={onJoin} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-45" title="Tham gia hội thoại và ngắt bot">
          <LogIn size={14} aria-hidden="true" /> Tham gia & ngắt bot
        </button>
      )}
    </div>
  );
}

export function ModeBadge({ mode }: { mode: ApiChatConversation["mode"] }) {
  return mode === "BOT"
    ? <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600"><Bot size={10} aria-hidden="true" /> Bot</span>
    : <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">TA</span>;
}
