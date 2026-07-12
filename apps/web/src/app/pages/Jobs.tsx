import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { Search, Filter } from "lucide-react";
import PublicJobCard from "@/app/components/PublicJobCard";
import { useData } from "@/app/data";
import { translateJobLevel, translateJobType, useLanguage } from "@/app/i18n";
import PublicLayout from "@/app/layouts/PublicLayout";

const ALL_FILTER = "all";
const TYPE_FILTERS = [ALL_FILTER, "Full-time", "Hybrid", "Remote"];
const LEVEL_FILTERS = [ALL_FILTER, "Mid-level", "Senior", "Manager"];

export default function Jobs() {
  const { jobs } = useData();
  const { language, t } = useLanguage();
  const [params] = useSearchParams();
  const query = params.get("q") ?? "";
  const [search, setSearch] = useState(query);
  const [typeFilter, setTypeFilter] = useState(ALL_FILTER);
  const [levelFilter, setLevelFilter] = useState(ALL_FILTER);

  useEffect(() => { setSearch(query); }, [query]);

  const published = jobs.filter(j => j.status === "published");
  const filtered = published.filter(j => {
    const q = search.toLowerCase();
    const matchSearch = !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.tags.some(t => t.toLowerCase().includes(q));
    return matchSearch && (typeFilter === ALL_FILTER || j.type === typeFilter) && (levelFilter === ALL_FILTER || j.level === levelFilter);
  });

  return (
    <PublicLayout>
      <div className="bg-gradient-to-br from-pink-50 to-background py-10 border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl font-black text-foreground mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{t("jobs.allJobs")}</h1>
          <p className="text-muted-foreground text-sm mb-6">{published.length} {t("jobs.openPositions")}</p>
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

      <div className="max-w-7xl mx-auto px-6 py-8">
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

        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🌸</div>
            <p className="text-lg font-semibold text-foreground">{t("jobs.noResults")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("jobs.searchHint")}</p>
            <button onClick={() => { setSearch(""); setTypeFilter(ALL_FILTER); setLevelFilter(ALL_FILTER); }} className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all">{t("common.clearFilters")}</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(job => (
              <PublicJobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
