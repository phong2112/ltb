import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Search, Briefcase, Building2, Users, Target, Star, LifeBuoy, ArrowRight, Sparkles, MapPin, Clock, ChevronRight, CheckCircle } from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import portraitImg from "@/imports/image.png";
import { useData } from "@/app/data";
import PublicLayout from "@/app/layouts/PublicLayout";
import { useLanguage } from "@/app/i18n";

export default function Home() {
  const { jobs } = useData();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const published = jobs.filter(j => j.status === "published").slice(0, 6);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(`/jobs?q=${encodeURIComponent(search)}`);
  }

  return (
    <PublicLayout>
      {/* HERO */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(130deg, #fff5f8 0%, #fde8ef 55%, #fad4e4 100%)" }}>
        <div className="absolute inset-y-0 right-0 z-0 w-full pointer-events-none lg:hidden" aria-hidden="true">
          <ImageWithFallback
            src={portraitImg}
            alt=""
            className="absolute right-[-22%] top-0 h-full w-[82%] object-cover object-top opacity-40 saturate-90 sm:right-[-10%] sm:w-[64%] sm:opacity-45 md:right-0 md:w-[50%] md:opacity-50"
            style={{
              WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 22%, black 88%, transparent 100%)",
              maskImage: "linear-gradient(90deg, transparent 0%, black 22%, black 88%, transparent 100%)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#fff5f8] via-[#fff5f8]/70 to-transparent" />
        </div>
        <div className="absolute top-10 right-[36%] z-0 w-14 h-14 rounded-full bg-primary/25 pointer-events-none" />
        <div className="absolute top-24 right-[28%] z-0 w-7 h-7 rounded-full bg-primary/50 pointer-events-none" />
        <div className="absolute bottom-20 right-[44%] z-0 w-9 h-9 rounded-full bg-pink-300/40 pointer-events-none" />
        <div className="absolute top-1/2 right-[22%] z-0 w-5 h-5 rounded-full bg-rose-400/30 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 pb-6 md:py-16 md:pb-6 flex flex-col lg:flex-row items-center gap-8">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/60 rounded-full text-xs font-semibold text-primary border border-pink-200 mb-5">
              <Sparkles size={12} /> {published.length} {t("home.tagline")}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground leading-[1.08] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              {t("home.titleBefore")}<br /><span className="text-primary italic">{t("home.heroDream")}</span> {t("home.titleAfter")}
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed mb-5 max-w-md">
              {t("home.heroSubtitle")}
              <br /><span className="text-sm">{t("home.heroSupport")}</span>
            </p>

            <form onSubmit={handleSearch} className="flex gap-2 bg-white rounded-2xl shadow-md border border-pink-100 p-2 max-w-lg mb-5">
              <div className="flex-1 flex items-center gap-3 px-3">
                <Search size={17} className="text-muted-foreground flex-shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("home.searchPlaceholder")} className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground" />
              </div>
              <button type="submit" className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all">{t("common.search")}</button>
            </form>

            <div className="flex flex-wrap gap-2 text-xs mb-8">
              <span className="text-muted-foreground">{t("home.popular")}</span>
              {["Designer", "React", "Marketing", "HR", "Data"].map(t => (
                <Link key={t} to={`/jobs?q=${t}`} className="px-3 py-1 bg-white/70 border border-pink-200 rounded-full hover:bg-white hover:border-primary hover:text-primary text-muted-foreground transition-all">{t}</Link>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              {[{ icon: <Briefcase size={15} />, label: t("home.jobStat"), val: `${published.length}+` }, { icon: <Building2 size={15} />, label: t("home.companyStat"), val: "50+" }, { icon: <Users size={15} />, label: t("home.statCandidates"), val: "1.2K+" }].map(s => (
                <div key={s.label} className="bg-white rounded-xl px-4 py-3 flex items-center gap-2.5 border border-pink-100 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">{s.icon}</div>
                  <div><div className="text-sm font-black text-foreground leading-none">{s.val}</div><div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div></div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden flex-shrink-0 items-end justify-center w-full self-end lg:flex lg:w-auto">
            <ImageWithFallback src={portraitImg} alt="Lường Thị Bích — HR Consultant" className="relative z-10 object-cover object-top drop-shadow-xl select-none" style={{ height: "480px", width: "480px", maxHeight: "50vw", maxWidth: "50vw", borderRadius: "50%" }} />
          </div>
        </div>

        {/* Features strip */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 pb-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
            {[
              { icon: <Target size={17} />, title: t("home.matchingTitle"), desc: t("home.matchingDesc") },
              { icon: <Star size={17} />, title: t("home.premiumTitle"), desc: t("home.premiumDesc") },
              { icon: <LifeBuoy size={17} />, title: t("home.careerSupportTitle"), desc: t("home.careerSupportDesc") },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-3 bg-white rounded-xl p-3.5 border border-pink-100 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">{f.icon}</div>
                <div><p className="text-xs font-black text-foreground leading-tight">{f.title}</p><p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{f.desc}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest jobs preview */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("home.latestJobs")}</h2>
          <Link to="/jobs" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">{t("home.ctaJobs")} <ArrowRight size={14} /></Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {published.map(job => (
            <Link key={job.id} to={`/jobs/${job.id}`} className="group bg-white border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-lg transition-all duration-200 flex flex-col gap-3 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-50/0 to-pink-50/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />
              <div className="relative flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-pink-50 flex items-center justify-center text-2xl flex-shrink-0 border border-pink-100">{job.logo}</div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm leading-tight group-hover:text-primary transition-colors" style={{ fontFamily: "'Playfair Display', serif" }}>{job.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{job.company}</p>
                  </div>
                </div>
                {job.urgent && <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-bold rounded-full border border-rose-200 flex-shrink-0">🔥 {t("jobs.urgent")}</span>}
              </div>
              <div className="relative flex flex-wrap gap-1.5">
                {job.tags.slice(0, 3).map(tag => <span key={tag} className="px-2 py-0.5 bg-pink-50 border border-pink-100 text-primary text-[10px] rounded-lg font-medium">{tag}</span>)}
              </div>
              <div className="relative flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin size={10} />{job.location}</span>
                <span className="ml-auto font-semibold text-amber-600 text-[11px]">💰 {job.salary}</span>
              </div>
              <div className="relative flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users size={10} />{job.applicants} {t("common.candidates")}</span>
                <span className="flex items-center gap-0.5 font-semibold text-primary group-hover:gap-1.5 transition-all">{t("common.viewDetails")} <ChevronRight size={12} /></span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
