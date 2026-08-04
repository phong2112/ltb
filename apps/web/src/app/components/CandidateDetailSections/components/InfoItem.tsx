import type { ReactNode } from "react";
import { Check, Copy } from "lucide-react";

type InfoItemProps = {
  icon: ReactNode;
  label: string;
  value: string;
  copied?: boolean;
  copyLabel?: string;
  copyValue?: string;
  onCopy?: () => void;
};

export function InfoItem({ icon, label, value, copied = false, copyLabel, copyValue, onCopy }: InfoItemProps) {
  const canCopy = Boolean(copyValue && onCopy);
  const resolvedCopyLabel = copyLabel || "Copy";

  return (
    <div className={`grid min-w-0 items-center gap-3 rounded-xl border border-border/80 bg-background/55 px-3.5 py-3 ${canCopy ? "grid-cols-[2.25rem_minmax(0,1fr)_auto]" : "grid-cols-[2.25rem_minmax(0,1fr)]"}`}>
      <div className="flex size-9 items-center justify-center rounded-lg bg-white text-primary ring-1 ring-border/80">
        {icon}
      </div>
      <div className="min-w-0">
        <dt className="line-clamp-1 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-0.5 line-clamp-2 break-words text-sm font-black leading-5 text-foreground" title={value}>
          {value}
        </dd>
      </div>
      {canCopy && (
        <button
          type="button"
          onClick={onCopy}
          title={resolvedCopyLabel}
          aria-label={`${resolvedCopyLabel}: ${copyValue}`}
          className={`flex size-8 flex-none items-center justify-center rounded-lg border bg-white transition-colors ${copied ? "border-emerald-200 text-emerald-600" : "border-border/80 text-muted-foreground hover:border-primary/40 hover:text-primary"}`}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      )}
    </div>
  );
}
