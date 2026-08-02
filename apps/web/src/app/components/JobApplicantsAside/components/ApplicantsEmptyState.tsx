import { Search, Users } from "lucide-react";

type ApplicantsEmptyStateProps = {
  clearLabel: string;
  hint?: string;
  mode: "no-applicants" | "no-results";
  title: string;
  onClearSearch?: () => void;
};

export function ApplicantsEmptyState({ clearLabel, hint, mode, title, onClearSearch }: ApplicantsEmptyStateProps) {
  if (mode === "no-results") {
    return (
      <div className="px-7 py-10 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary/70 ring-8 ring-pink-50/60"><Search size={21} /></div>
        <p className="text-sm font-black text-foreground">{title}</p>
        <button type="button" onClick={onClearSearch} className="mt-2 text-xs font-bold text-primary hover:underline">{clearLabel}</button>
      </div>
    );
  }

  return (
    <div className="px-7 py-16 text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary/70 ring-8 ring-pink-50/60"><Users size={24} /></div>
      <p className="text-sm font-black text-foreground">{title}</p>
      {hint && <p className="mx-auto mt-1.5 max-w-[250px] text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}

