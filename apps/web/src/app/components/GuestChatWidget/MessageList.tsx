import { Bot } from "lucide-react";
import type { ApiChatMessage } from "@/app/apis/models/chat";
import ChatMessageText from "@/app/components/ChatMessageText";

type Props = {
  messages: ApiChatMessage[];
  isBotTyping: boolean;
};

export default function GuestMessageList({ messages, isBotTyping }: Props) {
  return (
    <>
      {messages.map(message => {
        if (message.senderType === "SYSTEM") {
          return <p key={message.id} className="text-center text-[11px] font-semibold text-muted-foreground">{message.content}</p>;
        }

        const fromGuest = message.senderType === "GUEST";
        return (
          <div key={message.id} className={`flex ${fromGuest ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-5 shadow-sm ${fromGuest ? "rounded-br-md bg-primary text-white" : "rounded-bl-md border border-border bg-white text-foreground"}`}>
              {message.senderType === "BOT" && <p className="mb-1 flex items-center gap-1 text-[10px] font-bold text-primary"><Bot size={12} aria-hidden="true" /> Trợ lý ảo</p>}
              {message.senderType === "TA" && <p className="mb-1 text-[10px] font-bold text-primary">Tư vấn viên TA</p>}
              <ChatMessageText content={message.content} linkClassName={fromGuest ? "underline" : "font-semibold text-primary underline underline-offset-2"} />
              <p className={`mt-1 text-[10px] ${fromGuest ? "text-white/70" : "text-muted-foreground"}`}>{formatMessageTime(message.createdAt)}</p>
            </div>
          </div>
        );
      })}
      {isBotTyping && <p className="text-xs italic text-muted-foreground" role="status">Trợ lý đang trả lời…</p>}
    </>
  );
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(value));
}
