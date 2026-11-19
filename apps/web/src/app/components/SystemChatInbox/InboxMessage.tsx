import { Bot } from "lucide-react";
import type { ApiChatMessage } from "@/app/apis/models/chat";
import ChatMessageText from "@/app/components/ChatMessageText";

export default function InboxMessage({ message }: { message: ApiChatMessage }) {
  if (message.senderType === "SYSTEM") {
    return <p className="text-center text-[11px] font-semibold text-muted-foreground">{message.content} · {formatMessageTime(message.createdAt)}</p>;
  }

  const fromGuest = message.senderType === "GUEST";
  const fromBot = message.senderType === "BOT";
  const bubbleClass = fromGuest
    ? "rounded-bl-md border border-border bg-white text-foreground"
    : fromBot
      ? "rounded-br-md border border-primary/20 bg-primary/5 text-foreground"
      : "rounded-br-md bg-primary text-white";

  return (
    <div className={`flex ${fromGuest ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-5 shadow-sm ${bubbleClass}`}>
        {fromBot && <p className="mb-1 flex items-center gap-1 text-[10px] font-bold text-primary"><Bot size={12} aria-hidden="true" /> Bot trả lời</p>}
        <ChatMessageText content={message.content} linkClassName={fromGuest || fromBot ? "font-semibold text-primary underline" : "underline"} />
        <p className={`mt-1 text-[10px] ${fromGuest || fromBot ? "text-muted-foreground" : "text-white/70"}`}>{formatMessageTime(message.createdAt)}</p>
      </div>
    </div>
  );
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(value));
}
