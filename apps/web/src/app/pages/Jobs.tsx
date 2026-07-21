import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ChevronDown, Filter, Heart, List, RefreshCw, Search, X } from "lucide-react";
import { useData } from "@/app/data";
import { translateJobLevel, translateJobType, useLanguage, type Language, type TranslationKey } from "@/app/i18n";
import PublicLayout from "@/app/layouts/PublicLayout";
import { notificationService } from "@/app/services/notification";
import JobDetailPanel from "@/app/components/JobDetailPanel";
import PublicJobCard from "@/app/components/PublicJobCard";

const ALL_FILTER = "all";
const TYPE_FILTERS = [ALL_FILTER, "Full-time", "Hybrid", "Remote"];
const LEVEL_FILTERS = [ALL_FILTER, "Mid-level", "Senior", "Manager"];

export default function Jobs() {
  const {
    error,
    isLoading,
    jobs,
    reloadPublicJobs,
    savedJobIds,
    toggleSavedJob,
  } = useData();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const showSaved = params.get("view") === "saved";
  const selectedJobId = params.get("job");
  const [search, setSearch] = useState(query);
  const [typeFilter, setTypeFilter] = useState(ALL_FILTER);
  const [levelFilter, setLevelFilter] = useState(ALL_FILTER);
  const jobsContentRef = useRef<HTMLDivElement>(null);
  const focusedJobIdRef = useRef<string | null>(null);

  useEffect(() => { setSearch(query); }, [query]);

  const published = jobs.filter(job => job.status === "published");
  const savedJobs = published.filter(job => savedJobIds.includes(job.id));
  const visibleJobs = showSaved ? savedJobs : published;
  const filtered = visibleJobs.filter(job => {
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch = !normalizedSearch
      || job.title.toLowerCase().includes(normalizedSearch)
      || job.company.toLowerCase().includes(normalizedSearch)
      || job.tags.some(tag => tag.toLowerCase().includes(normalizedSearch));

    return matchesSearch
      && (typeFilter === ALL_FILTER || job.type === typeFilter)
      && (levelFilter === ALL_FILTER || job.level === levelFilter);
  });
  const selectedJob = filtered.find(job => job.id === selectedJobId) ?? filtered[0];
  const hasActiveFilters = Boolean(search.trim())
    || typeFilter !== ALL_FILTER
    || levelFilter !== ALL_FILTER;

  useEffect(() => {
    if (!selectedJobId || selectedJob?.id !== selectedJobId) return;

    const frame = window.requestAnimationFrame(() => {
      const selectedCard = document.getElementById(`job-card-${selectedJobId}`);
      if (!selectedCard) return;

      selectedCard.scrollIntoView({
        behavior: focusedJobIdRef.current === selectedJobId ? "auto" : "smooth",
        block: "center",
        inline: "nearest",
      });
      selectedCard.focus({ preventScroll: true });
      focusedJobIdRef.current = selectedJobId;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [filtered.length, selectedJob?.id, selectedJobId]);

  function setJobView(view: "all" | "saved") {
    const nextParams = new URLSearchParams(params);
    nextParams.delete("job");
    if (view === "saved") nextParams.set("view", "saved");
    else nextParams.delete("view");
    setParams(nextParams);
  }

  function removeSavedJob(jobId: string) {
    toggleSavedJob(jobId);
    notificationService.info(t("savedJobs.removedNotice"));
  }

  function selectJob(jobId: string) {
    const nextParams = new URLSearchParams(params);
    nextParams.set("job", jobId);
    const focusedJobsPath = `/jobs?${nextParams.toString()}`;

    if (!window.matchMedia("(min-width: 1024px)").matches) {
      const detailPath = `/jobs/${encodeURIComponent(jobId)}?from=${encodeURIComponent(focusedJobsPath)}`;
      navigate(focusedJobsPath, { replace: true });
      navigate(detailPath);
      return;
    }

    setParams(nextParams, { replace: true });
    window.requestAnimationFrame(() => {
      jobsContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextParams = new URLSearchParams(params);
    const normalizedSearch = search.trim();
    nextParams.delete("job");
    if (normalizedSearch) nextParams.set("q", normalizedSearch);
    else nextParams.delete("q");
    setParams(nextParams, { replace: true });
  }

  function clearSearch() {
    setSearch("");
    const nextParams = new URLSearchParams(params);
    nextParams.delete("q");
    nextParams.delete("job");
    setParams(nextParams, { replace: true });
  }

  function clearFilters() {
    setTypeFilter(ALL_FILTER);
    setLevelFilter(ALL_FILTER);
    clearSearch();
  }

  return (
    <PublicLayout>
      <section className="border-b border-border bg-gradient-to-br from-pink-50 via-white to-background py-5 sm:py-7">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-black leading-tight text-foreground sm:text-3xl" style={{ fontFamily: "'Playfair Display', serif" }}>
              {showSaved ? t("savedJobs.title") : t("jobs.allJobs")}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {showSaved ? t("savedJobs.subtitle") : `${published.length} ${t("jobs.openPositions")}`}
            </p>
          </div>

          <div className="mt-4 grid w-full grid-cols-2 rounded-xl border border-pink-100 bg-white p-1 shadow-sm sm:inline-flex sm:w-auto">
            <button
              type="button"
              onClick={() => setJobView("all")}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors sm:px-4 ${!showSaved ? "bg-primary text-white" : "text-muted-foreground hover:text-primary"}`}
            >
              <List size={15} />
              <span className="sm:hidden">{t("jobs.allTab")}</span>
              <span className="hidden sm:inline">{t("jobs.allJobs")}</span>
            </button>
            <button
              type="button"
              onClick={() => setJobView("saved")}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors sm:px-4 ${showSaved ? "bg-primary text-white" : "text-muted-foreground hover:text-primary"}`}
            >
              <Heart size={15} fill={showSaved ? "currentColor" : "none"} />
              <span className="sm:hidden">{t("savedJobs.shortTitle")}</span>
              <span className="hidden sm:inline">{t("common.savedJobs")}</span>
              {savedJobs.length > 0 && (
                <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] ${showSaved ? "bg-white/20 text-white" : "bg-pink-100 text-primary"}`}>
                  {savedJobs.length}
                </span>
              )}
            </button>
          </div>

          <form onSubmit={submitSearch} role="search" className="mt-3.5 flex max-w-2xl items-center gap-2 rounded-2xl border border-pink-100 bg-white p-1.5 shadow-sm">
            <Search size={17} className="ml-2.5 flex-none text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={t("home.searchPlaceholder")}
              aria-label={t("jobs.searchLabel")}
              className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label={t("jobs.clearSearch")}
                className="inline-flex size-9 flex-none items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-pink-50 hover:text-primary"
              >
                <X size={15} />
              </button>
            )}
            <button type="submit" className="min-h-10 flex-none rounded-xl bg-primary px-3 text-xs font-bold text-white transition-colors hover:bg-primary/90 sm:px-5 sm:text-sm">
              {t("common.search")}
            </button>
          </form>
        </div>
      </section>

      <div ref={jobsContentRef} className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
        <MobileFilters
          language={language}
          levelFilter={levelFilter}
          setLevelFilter={setLevelFilter}
          setTypeFilter={setTypeFilter}
          t={t}
          typeFilter={typeFilter}
        />

        <div className="mb-4 hidden flex-wrap items-center gap-2 md:flex">
          <Filter size={14} className="text-muted-foreground" aria-hidden="true" />
          <span className="mr-0.5 text-xs font-extrabold text-foreground">{t("jobs.typeFilter")}</span>
          {TYPE_FILTERS.map(item => (
            <FilterChip
              key={`type-${item}`}
              active={typeFilter === item}
              label={item === ALL_FILTER ? t("common.all") : translateJobType(item, language)}
              onClick={() => setTypeFilter(item)}
            />
          ))}
          <div className="mx-1 h-5 w-px bg-border" />
          <span className="mr-0.5 text-xs font-extrabold text-foreground">{t("jobs.levelFilter")}</span>
          {LEVEL_FILTERS.map(item => (
            <FilterChip
              key={`level-${item}`}
              active={levelFilter === item}
              label={item === ALL_FILTER ? t("common.all") : translateJobLevel(item, language)}
              onClick={() => setLevelFilter(item)}
            />
          ))}
        </div>

        {!isLoading && !error && (filtered.length > 0 || hasActiveFilters) && (
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black text-foreground">{showSaved ? t("savedJobs.title") : t("jobs.listHeading")}</h2>
            <span className="flex-none text-xs font-semibold text-muted-foreground" aria-live="polite">
              {filtered.length} {t("jobs.resultCount")}
            </span>
          </div>
        )}

        {isLoading && jobs.length === 0 ? (
          <JobsLoadingState />
        ) : error && jobs.length === 0 ? (
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-white px-5 py-12 text-center shadow-sm">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-pink-50 text-primary"><RefreshCw size={21} /></div>
            <p className="mt-4 text-base font-black text-foreground">{t("jobs.loadError")}</p>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{error}</p>
            <button type="button" onClick={() => void reloadPublicJobs()} className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90">
              {t("common.retry")}
            </button>
          </div>
        ) : showSaved && savedJobs.length === 0 ? (
          <div className="mx-auto max-w-md py-16 text-center sm:py-20">
            <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-pink-50 text-primary"><Heart size={27} /></div>
            <p className="text-lg font-semibold text-foreground">{t("savedJobs.emptyTitle")}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("savedJobs.emptyBody")}</p>
            <button type="button" onClick={() => setJobView("all")} className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90">{t("savedJobs.browseJobs")}</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center sm:py-24">
            <div className="mb-4 text-5xl">🌸</div>
            <p className="text-lg font-semibold text-foreground">{t("jobs.noResults")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("jobs.searchHint")}</p>
            <button type="button" onClick={clearFilters} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90">{t("common.clearFilters")}</button>
          </div>
        ) : (
          <div className="grid items-start gap-4 lg:h-[calc(100dvh-6rem)] lg:grid-cols-[370px_minmax(0,1fr)] lg:items-stretch">
            <div className="scrollbar-stable space-y-3 lg:h-full lg:min-h-0 lg:overscroll-contain lg:overflow-y-auto lg:pr-1">
              {filtered.map(job => (
                <PublicJobCard
                  key={job.id}
                  job={job}
                  active={selectedJob?.id === job.id}
                  onSelect={selectJob}
                  showRemoveSaved={showSaved}
                  onRemoveSaved={removeSavedJob}
                />
              ))}
            </div>
            {selectedJob && (
              <div id="job-detail" className="hidden lg:block lg:h-full lg:min-h-0">
                <JobDetailPanel job={selectedJob} />
              </div>
            )}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

type MobileFiltersProps = {
  language: Language;
  levelFilter: string;
  setLevelFilter: (value: string) => void;
  setTypeFilter: (value: string) => void;
  t: (key: TranslationKey) => string;
  typeFilter: string;
};

function MobileFilters({ language, levelFilter, setLevelFilter, setTypeFilter, t, typeFilter }: MobileFiltersProps) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 md:hidden" aria-label={t("jobs.filters")}>
      <MobileFilterSelect
        label={t("jobs.typeFilter")}
        value={typeFilter}
        onChange={setTypeFilter}
        options={TYPE_FILTERS.map(item => ({
          label: item === ALL_FILTER ? t("common.all") : translateJobType(item, language),
          value: item,
        }))}
      />
      <MobileFilterSelect
        label={t("jobs.levelFilter")}
        value={levelFilter}
        onChange={setLevelFilter}
        options={LEVEL_FILTERS.map(item => ({
          label: item === ALL_FILTER ? t("common.all") : translateJobLevel(item, language),
          value: item,
        }))}
      />
    </div>
  );
}

function MobileFilterSelect({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: { label: string; value: string }[]; value: string }) {
  return (
    <label className="relative rounded-xl border border-border bg-white px-3 py-2 shadow-sm">
      <span className="block text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="mt-0.5 w-full appearance-none bg-transparent pr-6 text-sm font-bold text-foreground outline-none"
      >
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute bottom-3 right-3 text-muted-foreground" />
    </label>
  );
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${active ? "border-primary bg-primary text-white" : "border-border bg-white text-muted-foreground hover:border-primary hover:text-primary"}`}
    >
      {label}
    </button>
  );
}

function JobsLoadingState() {
  return (
    <div className="grid gap-4 lg:grid-cols-[370px_minmax(0,1fr)]" aria-hidden="true">
      <div className="space-y-3">
        {[0, 1, 2].map(item => <div key={item} className="h-44 animate-pulse rounded-2xl border border-border bg-white/70" />)}
      </div>
      <div className="hidden h-[560px] animate-pulse rounded-2xl border border-border bg-white/70 lg:block" />
    </div>
  );
}
