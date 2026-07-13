import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Filter, Heart, List, Search } from "lucide-react";
import { useData } from "@/app/data";
import { translateJobLevel, translateJobType, useLanguage } from "@/app/i18n";
import PublicLayout from "@/app/layouts/PublicLayout";
import { notificationService } from "@/app/services/notification";
import JobDetailPanel from "@/app/components/JobDetailPanel";
import PublicJobCard from "@/app/components/PublicJobCard";

const ALL_FILTER = "all";
const TYPE_FILTERS = [ALL_FILTER, "Full-time", "Hybrid", "Remote"];
const LEVEL_FILTERS = [ALL_FILTER, "Mid-level", "Senior", "Manager"];

export default function Jobs() {
  const { jobs, savedJobIds, toggleSavedJob } = useData();
  const { language, t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const showSaved = params.get("view") === "saved";
  const selectedJobId = params.get("job");
  const [search, setSearch] = useState(query);
  const [typeFilter, setTypeFilter] = useState(ALL_FILTER);
  const [levelFilter, setLevelFilter] = useState(ALL_FILTER);
  const jobsContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setSearch(query); }, [query]);

  const published = jobs.filter(j => j.status === "published");
  const savedJobs = published.filter(job => savedJobIds.includes(job.id));
  const visibleJobs = showSaved ? savedJobs : published;
  const filtered = visibleJobs.filter(j => {
    const q = search.toLowerCase();
    const matchSearch = !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.tags.some(t => t.toLowerCase().includes(q));
    return matchSearch && (typeFilter === ALL_FILTER || j.type === typeFilter) && (levelFilter === ALL_FILTER || j.level === levelFilter);
  });
  const selectedJob = filtered.find(job => job.id === selectedJobId) ?? filtered[0];

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
    nextParams.set("job", jobId);
    setParams(nextParams, { replace: true });
    window.requestAnimationFrame(() => {
      jobsContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <PublicLayout>
      <div className="border-b border-border bg-gradient-to-br from-pink-50 to-background py-7">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl font-black text-foreground mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{showSaved ? t("savedJobs.title") : t("jobs.allJobs")}</h1>
          <p className="mb-3.5 text-sm text-muted-foreground">{showSaved ? t("savedJobs.subtitle") : `${published.length} ${t("jobs.openPositions")}`}</p>
          <div className="mb-3.5 inline-flex rounded-xl border border-pink-100 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setJobView("all")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${!showSaved ? "bg-primary text-white" : "text-muted-foreground hover:text-primary"}`}
            >
              <List size={15} /> {t("jobs.allJobs")}
            </button>
            <button
              type="button"
              onClick={() => setJobView("saved")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${showSaved ? "bg-primary text-white" : "text-muted-foreground hover:text-primary"}`}
            >
              <Heart size={15} fill={showSaved ? "currentColor" : "none"} /> {t("common.savedJobs")}
              {savedJobs.length > 0 && <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] ${showSaved ? "bg-white/20 text-white" : "bg-pink-100 text-primary"}`}>{savedJobs.length}</span>}
            </button>
          </div>
          <div className="flex gap-2 bg-white rounded-2xl shadow-sm border border-pink-100 p-2 max-w-2xl">
            <div className="flex-1 flex items-center gap-3 px-3">
              <Search size={16} className="text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("home.searchPlaceholder")} className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground" />
              {search && <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground text-xs">✕</button>}
            </div>
            <button className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all">{t("common.search")}</button>
          </div>
        </div>
      </div>

      <div ref={jobsContentRef} className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap gap-2 mb-6 items-center">
          <Filter size={13} className="text-muted-foreground" />
          {TYPE_FILTERS.map(item => (
            <button key={item} onClick={() => setTypeFilter(item)} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${typeFilter === item ? "bg-primary text-white border-primary" : "bg-white border-border text-muted-foreground hover:border-primary hover:text-primary"}`}>
              {item === ALL_FILTER ? t("common.all") : translateJobType(item, language)}
            </button>
          ))}
          <div className="w-px h-4 bg-border hidden md:block" />
          {LEVEL_FILTERS.map(item => (
            <button key={item} onClick={() => setLevelFilter(item)} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${levelFilter === item ? "bg-primary text-white border-primary" : "bg-white border-border text-muted-foreground hover:border-primary hover:text-primary"}`}>
              {item === ALL_FILTER ? t("common.all") : translateJobLevel(item, language)}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} {t("jobs.resultCount")}</span>
        </div>

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
          <div className="grid items-start gap-5 lg:h-[calc(100dvh-6rem)] lg:grid-cols-[370px_minmax(0,1fr)] lg:items-stretch">
            <div className="scrollbar-stable space-y-3 lg:h-full lg:min-h-0 lg:overscroll-contain lg:overflow-y-auto lg:pr-3">
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
            {selectedJob && <div id="job-detail" className="lg:h-full lg:min-h-0"><JobDetailPanel job={selectedJob} /></div>}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
