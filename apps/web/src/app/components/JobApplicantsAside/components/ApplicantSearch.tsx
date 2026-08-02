import { Search, X } from "lucide-react";

type ApplicantSearchProps = {
  filteredCount: number;
  placeholder: string;
  search: string;
  totalCount: number;
  clearLabel: string;
  countLabel: string;
  onChange: (value: string) => void;
};

export function ApplicantSearch({
  clearLabel,
  countLabel,
  filteredCount,
  placeholder,
  search,
  totalCount,
  onChange,
}: ApplicantSearchProps) {
  return (
    <div className="border-b border-border bg-white px-4 py-3">
      <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:border-primary/50 focus-within:ring-3 focus-within:ring-primary/10">
        <Search size={14} className="flex-none text-muted-foreground" />
        <input
          value={search}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground"
        />
        {search && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={clearLabel}
            className="flex size-6 flex-none items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-pink-50 hover:text-primary"
          >
            <X size={13} />
          </button>
        )}
      </label>
      <p className="mt-2 text-[11px] font-semibold text-muted-foreground">
        {filteredCount}/{totalCount} {countLabel}
      </p>
    </div>
  );
}

