import { Clock, MessageCircle } from "lucide-react";
import type { Candidate } from "@/app/data";
import { formatTime, iconForChannel, labelForChannel } from "@/app/components/CandidateChatPanel/utils";

type MessageListProps = {
  candidate: Candidate;
  isWidget: boolean;
};

export function MessageList({ candidate, isWidget }: MessageListProps) {
  return (
    <div className={`flex-1 overflow-y-auto bg-[#fbfaf9] ${isWidget ? "p-3" : "p-4"}`}>
      {candidate.messages.length === 0 ? (
        <div className="h-full min-h-[220px] flex items-center justify-center text-center text-muted-foreground">
          <div>
            <MessageCircle size={30} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm font-bold text-foreground">Chưa có hội thoại</p>
            <p className="text-xs mt-1">Gửi tin đầu tiên hoặc ghi nhận trao đổi từ kênh bên ngoài.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {candidate.messages.map((message) => {
            const outbound = message.direction === "outbound";

            return (
              <div key={message.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                <div className={`${isWidget ? "max-w-[86%]" : "max-w-[78%]"} rounded-2xl px-3 py-2 text-sm shadow-sm ${outbound ? "bg-primary text-white rounded-br-md" : "bg-white border border-border text-foreground rounded-bl-md"}`}>
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
  );
}

