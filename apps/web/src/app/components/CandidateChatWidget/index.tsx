import { useEffect, useState } from "react";
import { MessageCircle, Minus, X } from "lucide-react";
import CandidateChatPanel from "@/app/components/CandidateChatPanel";
import { useData } from "@/app/data";

const WIDGET_OPEN_KEY = "hr-copilot-chat-widget-open";

export default function CandidateChatWidget() {
  const { candidates } = useData();
  const [open, setOpen] = useState(() => readOpenState());
  const unreadCount = candidates.filter((candidate) => candidate.status === "new").length;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(WIDGET_OPEN_KEY, open ? "true" : "false");
  }, [open]);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 h-[min(620px,calc(100vh-6rem))] w-[min(820px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
          <div className="flex h-12 items-center justify-between border-b border-border bg-primary px-4 text-white">
            <div className="flex min-w-0 items-center gap-2">
              <MessageCircle size={17} />
              <span className="truncate text-sm font-black">Chat ứng viên</span>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setOpen(false)} className="h-8 w-8 rounded-full hover:bg-white/15 flex items-center justify-center" aria-label="Thu nhỏ chat">
                <Minus size={15} />
              </button>
              <button type="button" onClick={() => setOpen(false)} className="h-8 w-8 rounded-full hover:bg-white/15 flex items-center justify-center" aria-label="Đóng chat">
                <X size={15} />
              </button>
            </div>
          </div>
          <div className="h-[calc(100%-3rem)]">
            <CandidateChatPanel mode="widget" />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative h-14 w-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center hover:bg-primary/90 transition-colors"
        aria-label="Mở chat ứng viên"
      >
        <MessageCircle size={23} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black text-white">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}

function readOpenState() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(WIDGET_OPEN_KEY) === "true";
}
