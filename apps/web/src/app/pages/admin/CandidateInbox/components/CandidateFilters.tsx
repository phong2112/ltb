import { Search, X } from "lucide-react";
import type { CandidateStatus, Job } from "@/app/data";
import { translateCandidateStatus, type Language, type TranslationKey } from "@/app/services/i18n-service";
import {
  SORT_NAME_ASC,
  SORT_NEWEST,
  SORT_OLDEST,
  STATUS_OPTS,
} from "../constants";
import type { SortOrder } from "../types";

type CandidateFiltersProps = {
  filteredCount: number;
  jobs: Job[];
  jobFilter: string;
  language: Language;
  search: string;
  sortOrder: SortOrder;
  statusFilter: CandidateStatus | "all";
  t: (key: TranslationKey) => string;
  onJobFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onSortOrderChange: (value: SortOrder) => void;
  onStatusFilterChange: (value: CandidateStatus | "all") => void;
};

export function CandidateFilters({
  filteredCount,
  jobs,
  jobFilter,
  language,
  search,
  sortOrder,
  statusFilter,
  t,
  onJobFilterChange,
  onSearchChange,
  onSortOrderChange,
  onStatusFilterChange,
}: CandidateFiltersProps) {
  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-border/80 bg-white shadow-[0_10px_30px_rgba(120,70,86,0.05)]">
      <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-[minmax(280px,0.95fr)_minmax(0,1.35fr)] lg:items-start xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.4fr)]">
        <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus-within:border-primary/50 focus-within:ring-3 focus-within:ring-primary/10">
          <Search size={15} className="flex-none text-muted-foreground" />
          <input
            value={search}
            onChange={event => onSearchChange(event.target.value)}
            placeholder={t("admin.searchCandidates")}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="flex size-7 flex-none items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-pink-50 hover:text-primary"
              aria-label={t("common.clearFilters")}
            >
              <X size={14} />
            </button>
          )}
        </label>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTS.map(status => (
              <button
                key={status}
                type="button"
                onClick={() => onStatusFilterChange(status)}
                className={`inline-flex h-9 items-center rounded-full border px-3 text-xs font-black transition-all ${
                  statusFilter === status
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-border bg-white text-muted-foreground hover:border-primary/50 hover:bg-pink-50 hover:text-primary"
                }`}
              >
                {translateCandidateStatus(status, language)}
              </button>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(160px,220px)_auto] sm:items-center">
            <select
              value={jobFilter}
              onChange={event => onJobFilterChange(event.target.value)}
              className="h-10 min-w-0 rounded-xl border border-border bg-white px-3 text-sm font-bold text-foreground outline-none transition-colors focus:border-primary"
            >
              <option value="all">{t("admin.allPositions")}</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
            <select
              value={sortOrder}
              onChange={event => onSortOrderChange(event.target.value as SortOrder)}
              className="h-10 min-w-0 rounded-xl border border-border bg-white px-3 text-sm font-bold text-foreground outline-none transition-colors focus:border-primary"
              aria-label={t("admin.sortCandidates")}
            >
              <option value={SORT_NEWEST}>{t("admin.sortNewest")}</option>
              <option value={SORT_OLDEST}>{t("admin.sortOldest")}</option>
              <option value={SORT_NAME_ASC}>{t("admin.sortNameAsc")}</option>
            </select>
            <span className="rounded-full bg-secondary px-3 py-1.5 text-center text-xs font-black text-primary sm:text-right">
              {filteredCount} {t("jobs.resultCount")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

