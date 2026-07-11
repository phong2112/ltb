import { Link } from "react-router";
import { AlertCircle, ArrowRight, Bell, Briefcase, CheckCircle, Clock, Plus, Sparkles, TrendingUp, Users } from "lucide-react";
import { useData } from "@/app/data";
import { translateCandidateStatus, useLanguage } from "@/app/i18n";
import AdminLayout from "@/app/layouts/AdminLayout";

export default function AdminDashboard() {
  const { jobs, candidates } = useData();
  const { language, t } = useLanguage();

  const publishedJobs = jobs.filter(j => j.status === "published").length;
  const draftJobs = jobs.filter(j => j.status === "draft").length;
  const newCandidates = candidates.filter(c => c.status === "new").length;
  const followUps = candidates.filter(c => c.followUpDate && c.status !== "rejected" && c.status !== "offered").length;
  const topMatch = [...candidates].sort((a, b) => b.aiScore - a.aiScore).slice(0, 3);
  const recentCandidates = [...candidates].sort((a, b) => b.appliedAt.localeCompare(a.appliedAt)).slice(0, 5);
  const averageScore = candidates.length ? Math.round(candidates.reduce((sum, candidate) => sum + candidate.aiScore, 0) / candidates.length) : 0;
  const activePipeline = candidates.filter(candidate => candidate.status !== "rejected" && candidate.status !== "offered").length;

  const statusLabel: Record<string, { label: string; color: string }> = {
    new: { label: "Mới", color: "bg-blue-100 text-blue-700" },
    reviewing: { label: "Đang xem", color: "bg-amber-100 text-amber-700" },
    interview: { label: "Phỏng vấn", color: "bg-purple-100 text-purple-700" },
    offered: { label: "Đã gửi offer", color: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "Từ chối", color: "bg-red-100 text-red-600" },
  };

  const stats = [
    { label: t("admin.openJobs"), val: publishedJobs, meta: `${draftJobs} ${t("admin.draftCount")}`, icon: <Briefcase size={19} />, color: "text-primary bg-pink-50", link: "/admin/jobs" },
    { label: t("admin.newCandidates"), val: newCandidates, meta: `${activePipeline} ${t("admin.activePipeline")}`, icon: <Users size={19} />, color: "text-blue-600 bg-blue-50", link: "/admin/candidates" },
    { label: t("admin.needFollowUp"), val: followUps, meta: t("common.followUp"), icon: <Bell size={19} />, color: "text-amber-600 bg-amber-50", link: "/admin/follow-up" },
    { label: t("admin.totalCandidates"), val: candidates.length, meta: `${averageScore}% ${t("common.aiMatch")}`, icon: <TrendingUp size={19} />, color: "text-emerald-600 bg-emerald-50", link: "/admin/candidates" },
  ];

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-pink-100 bg-white px-3 py-1 text-xs font-bold text-primary">
            <Sparkles size={13} /> {t("admin.workspaceBadge")}
          </div>
          <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("common.dashboard")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t("admin.dashboardGreeting")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/jobs/new" className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary/90">
            <Plus size={15} /> {t("admin.createJob")}
          </Link>
          <Link to="/admin/candidates" className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-pink-200 bg-white px-4 text-sm font-bold text-primary transition-colors hover:border-primary">
            {t("admin.candidateInbox")} <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <Link key={s.label} to={s.link} className="group rounded-xl border border-border bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.color}`}>{s.icon}</div>
              <ArrowRight size={14} className="mt-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="flex items-end justify-between gap-2">
              <div>
                <div className="text-2xl font-black leading-none text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{s.val}</div>
                <div className="mt-1 text-xs font-semibold text-muted-foreground">{s.label}</div>
              </div>
              <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-muted-foreground">{s.meta}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        {/* Top AI Matches */}
        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-foreground flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              <Sparkles size={16} className="text-amber-500" /> {t("admin.topAiMatches")}
            </h2>
            <Link to="/admin/candidates" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">{t("home.ctaJobs")} <ArrowRight size={11} /></Link>
          </div>
          <div className="space-y-3">
            {topMatch.length ? topMatch.map(c => (
              <Link key={c.id} to={`/admin/candidates/${c.id}`} className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-pink-50">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.jobTitle}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className={`h-full rounded-full ${c.aiScore >= 90 ? "bg-emerald-500" : c.aiScore >= 75 ? "bg-amber-500" : "bg-muted-foreground"}`} style={{ width: `${Math.min(c.aiScore, 100)}%` }} />
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className={`text-sm font-black ${c.aiScore >= 90 ? "text-emerald-600" : c.aiScore >= 75 ? "text-amber-600" : "text-muted-foreground"}`}>{c.aiScore}%</div>
                  <div className="text-[10px] text-muted-foreground">{t("common.aiMatch")}</div>
                </div>
              </Link>
            )) : (
              <div className="rounded-xl border border-dashed border-border bg-background p-4 text-sm font-semibold text-muted-foreground">
                {t("admin.noCandidates")}
              </div>
            )}
          </div>
        </div>

        {/* Recent candidates */}
        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("admin.recentCandidates")}</h2>
            <Link to="/admin/candidates" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">{t("home.ctaJobs")} <ArrowRight size={11} /></Link>
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {recentCandidates.length ? recentCandidates.map(c => (
              <Link key={c.id} to={`/admin/candidates/${c.id}`} className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 bg-white p-3 transition-colors hover:bg-pink-50">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground font-bold text-sm flex-shrink-0">{c.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{c.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="truncate">{c.jobTitle}</span>
                    <span className="inline-flex items-center gap-1"><Clock size={11} /> {c.appliedAt}</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${statusLabel[c.status]?.color}`}>
                  {translateCandidateStatus(c.status, language) || statusLabel[c.status]?.label}
                </span>
              </Link>
            )) : (
              <div className="bg-background p-4 text-sm font-semibold text-muted-foreground">{t("admin.noCandidates")}</div>
            )}
          </div>
        </div>

        {/* Priority tasks */}
        <div className="rounded-xl border border-border bg-white p-5 xl:col-span-2">
          <h2 className="font-black text-foreground mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>{t("admin.todayTasks")}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { icon: <AlertCircle size={15} className="text-amber-500" />, text: `${newCandidates} ${t("admin.newProfilesTask")}`, urgent: newCandidates > 0, link: "/admin/candidates" },
              { icon: <Bell size={15} className="text-blue-500" />, text: `${followUps} ${t("admin.followUpTask")}`, urgent: followUps > 0, link: "/admin/follow-up" },
              { icon: <Briefcase size={15} className="text-primary" />, text: `${draftJobs} ${t("admin.draftJobsTask")}`, urgent: false, link: "/admin/jobs" },
              { icon: <CheckCircle size={15} className="text-emerald-500" />, text: t("admin.reviewTopCandidates"), urgent: false, link: "/admin/candidates" },
            ].map((t, i) => (
              <Link key={i} to={t.link} className={`flex items-center gap-3 rounded-xl border p-3.5 transition-all hover:shadow-sm ${t.urgent ? "border-amber-200 bg-amber-50 hover:border-amber-300" : "border-border bg-background hover:border-primary/30"}`}>
                <span className="flex-shrink-0">{t.icon}</span>
                <span className={`text-sm font-semibold ${t.urgent ? "text-amber-800" : "text-foreground"}`}>{t.text}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
