import type { CandidateMessageChannel } from "@/app/data";
import { CHANNELS } from "@/app/components/CandidateChatPanel/constants";

type ChannelSelectorProps = {
  channel: CandidateMessageChannel;
  isWidget: boolean;
  onChange: (channel: CandidateMessageChannel) => void;
};

export function ChannelSelector({ channel, isWidget, onChange }: ChannelSelectorProps) {
  return (
    <div className={`border-b border-border bg-background/60 ${isWidget ? "p-2" : "p-3"}`}>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CHANNELS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`flex min-w-max items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-bold transition-colors ${channel === item.value ? "border-primary bg-primary text-white" : "border-border bg-white text-muted-foreground hover:border-primary hover:text-primary"}`}
          >
            {item.icon}
            {item.label}
            {!isWidget && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${channel === item.value ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>{item.status}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

