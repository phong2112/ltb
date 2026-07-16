import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Search, Briefcase, Building2, Users, Target, Star, LifeBuoy, ArrowRight, Sparkles, Heart } from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import PublicJobCard from "@/app/components/PublicJobCard";
import portraitImg from "@/imports/image.png";
import { useData } from "@/app/data";
import PublicLayout from "@/app/layouts/PublicLayout";
import { useLanguage } from "@/app/i18n";

export default function Home() {
  const { jobs, savedJobIds } = useData();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const published = jobs.filter(j => j.status === "published");
  const latestJobs = published.slice(0, 6);
  const favoriteJobs = published.filter(job => savedJobIds.includes(job.id));
  const heroSubtitle = t("home.heroSubtitle");
  const heroSupport = t("home.heroSupport");

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

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 py-9 pb-4 md:py-11 md:pb-4 lg:flex-row">
          <div className="flex-1">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white/60 px-3 py-1.5 text-xs font-semibold text-primary">
              <Sparkles size={12} /> {published.length} {t("home.tagline")}
            </div>
            <h1 className="mb-3 text-4xl font-black leading-[1.08] text-foreground md:text-5xl lg:text-6xl" style={{ fontFamily: "'Playfair Display', serif" }}>
              {t("home.titleBefore")}<br /><span className="text-primary italic">{t("home.heroDream")}</span> {t("home.titleAfter")}
            </h1>
            {(heroSubtitle || heroSupport) && (
              <p className="mb-4 max-w-md text-base leading-relaxed text-muted-foreground">
                {heroSubtitle}
                {heroSubtitle && heroSupport && <br />}
                {heroSupport && <span className="text-sm">{heroSupport}</span>}
              </p>
            )}

            <form onSubmit={handleSearch} className="mb-4 flex max-w-lg gap-2 rounded-2xl border border-pink-100 bg-white p-2 shadow-md">
              <div className="flex-1 flex items-center gap-3 px-3">
                <Search size={17} className="text-muted-foreground flex-shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("home.searchPlaceholder")} className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground" />
              </div>
              <button type="submit" className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all">{t("common.search")}</button>
            </form>

            <div className="mb-5 flex flex-wrap gap-2 text-xs">
              <span className="text-muted-foreground">{t("home.popular")}</span>
              {["Designer", "React", "Marketing", "TA", "Data"].map(t => (
                <Link key={t} to={`/jobs?q=${t}`} className="px-3 py-1 bg-white/70 border border-pink-200 rounded-full hover:bg-white hover:border-primary hover:text-primary text-muted-foreground transition-all">{t}</Link>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              {[{ icon: <Briefcase size={15} />, label: t("home.jobStat"), val: `${published.length}+` }, { icon: <Building2 size={15} />, label: t("home.companyStat"), val: "200+" }, { icon: <Users size={15} />, label: t("home.statCandidates"), val: "1.2K+" }].map(s => (
                <div key={s.label} className="bg-white rounded-xl px-4 py-3 flex items-center gap-2.5 border border-pink-100 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">{s.icon}</div>
                  <div><div className="text-sm font-black text-foreground leading-none">{s.val}</div><div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div></div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden flex-shrink-0 items-end justify-center w-full self-end lg:flex lg:w-auto">
            <ImageWithFallback src={portraitImg} alt="Lường Bích — TA Consultant" className="relative z-10 select-none object-cover object-top drop-shadow-xl" style={{ height: "440px", width: "440px", maxHeight: "46vw", maxWidth: "46vw", borderRadius: "50%" }} />
          </div>
        </div>

        {/* Features strip */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 pb-7">
          <div className="grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: <Target size={17} />, title: t("home.matchingTitle"), desc: t("home.matchingDesc") },
              { icon: <Star size={17} />, title: t("home.premiumTitle"), desc: t("home.premiumDesc") },
              { icon: <LifeBuoy size={17} />, title: t("home.careerSupportTitle"), desc: t("home.careerSupportDesc") },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-3 rounded-xl border border-pink-100 bg-white p-3.5 shadow-sm">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{f.icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-nowrap text-xs font-black leading-tight text-foreground">{f.title}</p>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest jobs preview */}
      <section className="mx-auto max-w-7xl px-6 py-9">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-black text-foreground">{t("home.latestJobs")}</h2>
          <Link to="/jobs" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">{t("home.ctaJobs")} <ArrowRight size={14} /></Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {latestJobs.map(job => (
            <PublicJobCard key={job.id} job={job} />
          ))}
        </div>

        {favoriteJobs.length > 0 && (
          <div className="mt-8 border-t border-border pt-7">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 text-2xl font-black text-foreground">
                <Heart size={20} className="text-primary" fill="currentColor" /> {t("home.favoriteJobs")}
              </h2>
              <Link to="/jobs?view=saved" className="flex flex-shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline">{t("home.ctaJobs")} <ArrowRight size={14} /></Link>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {favoriteJobs.map(job => (
                <PublicJobCard key={job.id} job={job} />
              ))}
            </div>
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
