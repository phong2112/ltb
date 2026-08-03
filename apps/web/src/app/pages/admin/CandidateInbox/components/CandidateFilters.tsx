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
  const selectClass = "h-11 min-w-0 rounded-xl border border-border bg-white px-3 text-sm font-bold text-foreground outline-none transition-colors focus:border-primary focus:ring-3 focus:ring-primary/10";

  return (
    <div className="mb-4 rounded-2xl border border-border/80 bg-white p-3 shadow-[0_10px_30px_rgba(120,70,86,0.05)] sm:p-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(300px,0.95fr)_minmax(0,1.65fr)_auto] xl:items-center">
        <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm text-foreground transition-colors focus-within:border-primary/50 focus-within:ring-3 focus-within:ring-primary/10">
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

        <div className="grid min-w-0 gap-2 sm:grid-cols-3">
          <select
            value={statusFilter}
            onChange={event => onStatusFilterChange(event.target.value as CandidateStatus | "all")}
            className={selectClass}
            aria-label={t("admin.status")}
          >
            {STATUS_OPTS.map(status => (
              <option key={status} value={status}>
                {translateCandidateStatus(status, language)}
              </option>
            ))}
          </select>
          <select
            value={jobFilter}
            onChange={event => onJobFilterChange(event.target.value)}
            className={selectClass}
          >
            <option value="all">{t("admin.allPositions")}</option>
            {jobs.map(job => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>
          <select
            value={sortOrder}
            onChange={event => onSortOrderChange(event.target.value as SortOrder)}
            className={selectClass}
            aria-label={t("admin.sortCandidates")}
          >
            <option value={SORT_NEWEST}>{t("admin.sortNewest")}</option>
            <option value={SORT_OLDEST}>{t("admin.sortOldest")}</option>
            <option value={SORT_NAME_ASC}>{t("admin.sortNameAsc")}</option>
          </select>
        </div>

        <span className="flex h-11 items-center justify-center rounded-xl bg-secondary px-4 text-center text-xs font-black text-primary xl:min-w-28">
          {filteredCount} {t("jobs.resultCount")}
        </span>
      </div>
    </div>
  );
}
