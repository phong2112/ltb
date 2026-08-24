import type { FormEvent } from "react";
import { Send } from "lucide-react";
import type { ChannelOption } from "@/app/components/CandidateChatPanel/types";

type MessageComposerProps = {
  activeChannel: ChannelOption;
  draft: string;
  error: string;
  isSending: boolean;
  isWidget: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function MessageComposer({
  activeChannel,
  draft,
  error,
  isSending,
  isWidget,
  onDraftChange,
  onSubmit,
}: MessageComposerProps) {
  return (
    <form onSubmit={onSubmit} className="border-t border-border p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 font-bold">{activeChannel.icon} {activeChannel.label}</span>
        {!isWidget && <span>{activeChannel.status}</span>}
      </div>
      <div className="flex items-end gap-2">
        <textarea
          rows={isWidget ? 2 : 3}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
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
  );
}

