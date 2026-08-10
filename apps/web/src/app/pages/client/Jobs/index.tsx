import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Filter, Heart, List, Search, Sparkles } from "lucide-react";
import { useData } from "@/app/data";
import { translateJobLevel, translateJobType, useLanguage } from "@/app/services/i18n-service";
import PublicLayout from "@/app/layouts/PublicLayout";
import { notificationService } from "@/app/services/notification.service";
import JobDetailPanel from "@/app/components/JobDetailPanel";
import PublicJobCard from "@/app/components/PublicJobCard";

const ALL_FILTER = "all";
const TYPE_FILTERS = [ALL_FILTER, "Full-time", "Hybrid", "Remote"];
const LEVEL_FILTERS = [ALL_FILTER, "Mid-level", "Senior", "Manager"];
const PUBLIC_HEADER_SCROLL_OFFSET = 80;

export default function Jobs() {
  const { jobs, savedJobIds, toggleSavedJob } = useData();
  const { language, t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const showSaved = params.get("view") === "saved";
  const selectedJobId = params.get("job");
  const [search, setSearch] = useState(query);
  const [typeFilter, setTypeFilter] = useState(() => readFilter(params, "type", TYPE_FILTERS));
  const [levelFilter, setLevelFilter] = useState(() => readFilter(params, "level", LEVEL_FILTERS));
  const focusedJobIdRef = useRef<string | null>(null);
  const skipNextCardScrollRef = useRef<string | null>(null);

  useEffect(() => {
    setSearch(query);
    setTypeFilter(readFilter(params, "type", TYPE_FILTERS));
    setLevelFilter(readFilter(params, "level", LEVEL_FILTERS));
  }, [params, query]);

  useEffect(() => {
    const next = new URLSearchParams(params);
    setOptionalParam(next, "q", search.trim());
    setOptionalParam(next, "type", typeFilter === ALL_FILTER ? "" : typeFilter);
    setOptionalParam(next, "level", levelFilter === ALL_FILTER ? "" : levelFilter);
    if (next.toString() !== params.toString()) setParams(next, { replace: true, preventScrollReset: true });
  }, [levelFilter, params, search, setParams, typeFilter]);

  const published = jobs.filter(j => j.status === "published");
  const savedJobs = published.filter(job => savedJobIds.includes(job.id));
  const visibleJobs = showSaved ? savedJobs : published;
  const filtered = visibleJobs.filter(j => {
    const q = search.toLowerCase();
    const matchSearch = !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.tags.some(t => t.toLowerCase().includes(q));
    return matchSearch && (typeFilter === ALL_FILTER || j.type === typeFilter) && (levelFilter === ALL_FILTER || j.level === levelFilter);
  });
  const selectedJob = filtered.find(job => job.id === selectedJobId) ?? filtered[0];
  const expandedJobId = selectedJobId && selectedJob?.id === selectedJobId ? selectedJobId : null;

  useEffect(() => {
    if (!selectedJobId || selectedJob?.id !== selectedJobId) return;

    let innerFrame = 0;
    const frame = window.requestAnimationFrame(() => {
      innerFrame = window.requestAnimationFrame(() => {
        if (skipNextCardScrollRef.current === selectedJobId) {
          skipNextCardScrollRef.current = null;
          focusedJobIdRef.current = selectedJobId;
          return;
        }

        const selectedCard = document.getElementById(`job-card-${selectedJobId}`);
        if (!selectedCard) return;

        const behavior = focusedJobIdRef.current === selectedJobId ? "auto" : "smooth";
        if (window.matchMedia("(max-width: 1023px)").matches) {
          window.scrollTo({
            top: Math.max(0, selectedCard.getBoundingClientRect().top + window.scrollY - PUBLIC_HEADER_SCROLL_OFFSET),
            behavior,
          });
        } else {
          selectedCard.scrollIntoView({
            behavior,
            block: "center",
            inline: "nearest",
          });
        }
        selectedCard.focus({ preventScroll: true });
        focusedJobIdRef.current = selectedJobId;
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(innerFrame);
    };
  }, [filtered.length, selectedJob?.id, selectedJobId]);

  const setJobView = (view: "all" | "saved") => {
    const nextParams = new URLSearchParams(params);
    if (view === "saved") nextParams.set("view", "saved");
    else nextParams.delete("view");
    setParams(nextParams);
  };

  const removeSavedJob = (jobId: string) => {
    toggleSavedJob(jobId);
    notificationService.info(t("savedJobs.removedNotice"));
  };

  const selectJob = (jobId: string) => {
    const nextParams = new URLSearchParams(params);

    if (expandedJobId === jobId) {
      nextParams.delete("job");
      skipNextCardScrollRef.current = null;
      focusedJobIdRef.current = null;
      setParams(nextParams, { replace: true, preventScrollReset: true });
      return;
    }

    nextParams.set("job", jobId);
    skipNextCardScrollRef.current = jobId;
    setParams(nextParams, { replace: true, preventScrollReset: true });
  };

  return (
    <PublicLayout>
      {/* Jobs Header And Search */}
      <div className="border-b border-border bg-gradient-to-br from-pink-50 to-background py-7">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h1 className="text-3xl font-black text-foreground mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{showSaved ? t("savedJobs.title") : t("jobs.allJobs")}</h1>
          <p className="mb-3.5 text-sm text-muted-foreground">{showSaved ? t("savedJobs.subtitle") : `${published.length} ${t("jobs.openPositions")}`}</p>
          <div className="mb-3.5 flex max-w-full overflow-x-auto rounded-xl border border-pink-100 bg-white p-1 shadow-sm min-[500px]:inline-flex">
            <button
              type="button"
              onClick={() => setJobView("all")}
              className={`inline-flex min-w-max flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors min-[500px]:flex-none min-[500px]:px-4 ${!showSaved ? "bg-primary text-white" : "text-muted-foreground hover:text-primary"}`}
            >
              <List size={15} /> {t("jobs.allJobs")}
            </button>
            <button
              type="button"
              onClick={() => setJobView("saved")}
              className={`inline-flex min-w-max flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors min-[500px]:flex-none min-[500px]:px-4 ${showSaved ? "bg-primary text-white" : "text-muted-foreground hover:text-primary"}`}
            >
              <Heart size={15} fill={showSaved ? "currentColor" : "none"} /> {t("common.savedJobs")}
              {savedJobs.length > 0 && <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] ${showSaved ? "bg-white/20 text-white" : "bg-pink-100 text-primary"}`}>{savedJobs.length}</span>}
            </button>
          </div>
          <div className="flex max-w-2xl flex-col gap-2 rounded-2xl border border-pink-100 bg-white p-2 shadow-sm min-[430px]:flex-row">
            <div className="flex min-w-0 flex-1 items-center gap-2 px-2 sm:gap-3 sm:px-3">
              <Search size={16} className="text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("home.searchPlaceholder")} className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground" />
              {search && <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground text-xs">✕</button>}
            </div>
            <button className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all">{t("common.search")}</button>
          </div>
        </div>
      </div>

      {/* Jobs Browser */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Filter Bar */}
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-white/80 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-pink-50 text-primary">
              <Filter size={14} />
            </span>
            {TYPE_FILTERS.map(item => (
              <button key={item} onClick={() => setTypeFilter(item)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${typeFilter === item ? "border-primary bg-primary text-white shadow-sm" : "border-border bg-white text-muted-foreground hover:border-primary/60 hover:text-primary"}`}>
                {item === ALL_FILTER ? t("common.all") : translateJobType(item, language)}
              </button>
            ))}
            <div className="mx-1 hidden h-5 w-px bg-border md:block" />
            {LEVEL_FILTERS.map(item => (
              <button key={item} onClick={() => setLevelFilter(item)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${levelFilter === item ? "border-primary bg-primary text-white shadow-sm" : "border-border bg-white text-muted-foreground hover:border-primary/60 hover:text-primary"}`}>
                {item === ALL_FILTER ? t("common.all") : translateJobLevel(item, language)}
              </button>
            ))}
          </div>
          <span className="inline-flex w-fit flex-none items-center gap-1.5 rounded-full border border-pink-100 bg-pink-50 px-3 py-1.5 text-xs font-bold text-primary">
            <Sparkles size={13} />
            {filtered.length} {t("jobs.resultCount")}
          </span>
        </div>

        {/* Empty States Or Job Results */}
        {showSaved && savedJobs.length === 0 ? (
          <div className="mx-auto max-w-md py-20 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-pink-50 text-primary"><Heart size={27} /></div>
            <p className="text-lg font-semibold text-foreground">{t("savedJobs.emptyTitle")}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("savedJobs.emptyBody")}</p>
            <button onClick={() => setJobView("all")} className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90">{t("savedJobs.browseJobs")}</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🌸</div>
            <p className="text-lg font-semibold text-foreground">{t("jobs.noResults")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("jobs.searchHint")}</p>
            <button onClick={() => { setSearch(""); setTypeFilter(ALL_FILTER); setLevelFilter(ALL_FILTER); }} className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all">{t("common.clearFilters")}</button>
          </div>
        ) : (
          /* Split Job List And Detail Panel */
          <div className="grid items-start gap-4 lg:h-[calc(100dvh-6rem)] lg:grid-cols-[370px_minmax(0,1fr)] lg:items-stretch">
            <div className="scrollbar-stable space-y-3 lg:h-full lg:min-h-0 lg:overscroll-contain lg:overflow-y-auto lg:pr-1">
            {filtered.map(job => {
              const active = expandedJobId === job.id;

              return (
                <PublicJobCard
                  key={job.id}
                  job={job}
                  active={active}
                  onSelect={selectJob}
                  showRemoveSaved={showSaved}
                  onRemoveSaved={removeSavedJob}
                  expandedContent={active ? <div className="lg:hidden"><JobDetailPanel job={job} variant="inline" /></div> : undefined}
                />
              );
            })}
            </div>
            {selectedJob && <div id="job-detail" className="hidden lg:block lg:h-full lg:min-h-0"><JobDetailPanel job={selectedJob} /></div>}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

function readFilter(searchParams: URLSearchParams, key: string, allowedValues: readonly string[]) {
  const value = searchParams.get(key);
  return value && allowedValues.includes(value) ? value : ALL_FILTER;
}

function setOptionalParam(params: URLSearchParams, key: string, value: string) {
  if (value) {
    params.set(key, value);
  } else {
    params.delete(key);
  }
}
