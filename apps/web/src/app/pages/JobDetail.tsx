import { Link, useParams } from "react-router";
import { MapPin, Clock, Users, Briefcase, ChevronLeft, Send, Heart, Building2, DollarSign } from "lucide-react";
import { useData } from "@/app/data";
import { translateJobLevel, translateJobType, useLanguage } from "@/app/i18n";
import PublicLayout from "@/app/layouts/PublicLayout";

const typeColors: Record<string, string> = {
  "Full-time": "bg-pink-100 text-pink-700",
  "Hybrid": "bg-purple-100 text-purple-700",
  "Remote": "bg-emerald-100 text-emerald-700",
};

function renderText(text: string) {
  return text.split("\n").map((line, i) => {
    if (!line.trim()) return <br key={i} />;
    if (line.startsWith("- ")) return <li key={i} className="ml-4">{line.slice(2)}</li>;
    const bold = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    return <p key={i} dangerouslySetInnerHTML={{ __html: bold }} />;
  });
}

export default function JobDetail() {
  const { id } = useParams();
  const { jobs, isLoading, isJobSaved, toggleSavedJob } = useData();
  const { language, t } = useLanguage();
  const job = jobs.find(j => j.id === id && j.status === "published");

  if (!job && isLoading) return (
    <PublicLayout>
      <div className="text-center py-32 text-sm font-semibold text-muted-foreground">Đang tải vị trí...</div>
    </PublicLayout>
  );

  if (!job) return (
    <PublicLayout>
      <div className="text-center py-32">
        <div className="text-5xl mb-4">🌸</div>
        <p className="text-xl font-bold text-foreground mb-2">{t("jobDetail.notFound")}</p>
        <Link to="/jobs" className="text-primary underline text-sm">{t("common.backToJobs")}</Link>
      </div>
    </PublicLayout>
  );

  const saved = isJobSaved(job.id);

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
          <ChevronLeft size={15} /> {t("common.backToList")}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-5">
            {/* Header card */}
            <div className="bg-white rounded-2xl border border-border p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-pink-100 flex items-center justify-center text-4xl flex-shrink-0 border border-pink-100">{job.logo}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap mb-1">
                    <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{job.title}</h1>
                    {job.urgent && <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-xs font-bold rounded-full border border-rose-200 mt-1">🔥 {t("jobs.urgentHiring")}</span>}
                  </div>
                  <p className="text-muted-foreground font-semibold">{job.company}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin size={11} />{job.location}</span>
                    <span className="flex items-center gap-1"><Clock size={11} />{job.posted}</span>
                    <span className="flex items-center gap-1"><Users size={11} />{job.applicants} {t("jobs.applicantsApplied")}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${typeColors[job.type] || "bg-pink-100 text-pink-700"}`}>{translateJobType(job.type, language)}</span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-secondary text-secondary-foreground border border-border">{translateJobLevel(job.level, language)}</span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">💰 {job.salary}</span>
                {job.tags.map(tag => <span key={tag} className="px-3 py-1 bg-pink-50 border border-pink-100 text-primary text-xs rounded-full font-medium">{tag}</span>)}
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl border border-border p-6">
              <h2 className="text-lg font-black text-foreground mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>{t("jobDetail.description")}</h2>
              <div className="text-sm text-foreground leading-relaxed space-y-1.5">{renderText(job.description)}</div>
            </div>

            {/* Requirements */}
            <div className="bg-white rounded-2xl border border-border p-6">
              <h2 className="text-lg font-black text-foreground mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>{t("jobDetail.requirements")}</h2>
              <ul className="text-sm text-foreground leading-relaxed space-y-1.5">{renderText(job.requirements)}</ul>
            </div>

            {/* Benefits */}
            <div className="bg-white rounded-2xl border border-border p-6">
              <h2 className="text-lg font-black text-foreground mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>{t("jobDetail.benefits")}</h2>
              <ul className="text-sm text-foreground leading-relaxed space-y-1.5">{renderText(job.benefits)}</ul>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-border p-5 sticky top-20">
              <h3 className="font-black text-foreground mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>{t("jobDetail.applyNow")}</h3>
              <p className="text-xs text-muted-foreground mb-4">{t("jobDetail.applyBody")}</p>
              <Link to={`/jobs/${job.id}/apply`} className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-sm mb-3">
                <Send size={15} /> {t("jobDetail.applyNow")}
              </Link>
              <button
                type="button"
                onClick={() => toggleSavedJob(job.id)}
                aria-pressed={saved}
                className={`flex items-center justify-center gap-2 w-full py-2.5 border rounded-xl font-semibold text-sm transition-all ${
                  saved
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                <Heart size={14} fill={saved ? "currentColor" : "none"} /> {saved ? t("jobDetail.savedJob") : t("jobDetail.saveJob")}
              </button>

              <div className="mt-5 pt-4 border-t border-border space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Building2 size={13} className="text-primary" /><span>{job.company}</span></div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin size={13} className="text-primary" /><span>{job.location}</span></div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Briefcase size={13} className="text-primary" /><span>{translateJobType(job.type, language)} · {translateJobLevel(job.level, language)}</span></div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><DollarSign size={13} className="text-primary" /><span>{job.salary}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
