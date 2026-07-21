import { Link } from "react-router";
import { AlertCircle, ArrowRight, Bell, Briefcase, CheckCircle, Clock, Plus, TrendingUp, Users } from "lucide-react";
import { useData } from "@/app/data";
import { translateCandidateStatus, useLanguage } from "@/app/i18n";
import AdminLayout from "@/app/layouts/AdminLayout";
import { CANDIDATE_STATUS_CONFIG } from "@/app/status-config";

export default function AdminDashboard() {
  const { jobs, candidates, candidateProfiles } = useData();
  const { language, t } = useLanguage();

  const publishedJobs = jobs.filter(j => j.status === "published").length;
  const draftJobs = jobs.filter(j => j.status === "draft").length;
  const newCandidates = candidateProfiles.filter(candidate => candidate.applications.some(application => application.status === "new")).length;
  const followUps = candidates.filter(c => c.followUpDate && c.status !== "rejected" && c.status !== "offer").length;
  const recentCandidates = [...candidates].sort((a, b) => b.appliedAt.localeCompare(a.appliedAt)).slice(0, 5);
  const activePipeline = candidates.filter(candidate => candidate.status !== "rejected" && candidate.status !== "offer").length;
  const reviewedCandidates = candidates.filter(candidate => candidate.status !== "new").length;

  const stats = [
    { label: t("admin.openJobs"), val: publishedJobs, meta: `${draftJobs} ${t("admin.draftCount")}`, icon: <Briefcase size={19} />, color: "text-primary bg-pink-50", link: "/admin/jobs" },
    { label: t("admin.newCandidates"), val: newCandidates, meta: `${activePipeline} ${t("admin.activePipeline")}`, icon: <Users size={19} />, color: "text-blue-600 bg-blue-50", link: "/admin/candidates" },
    { label: t("admin.needFollowUp"), val: followUps, meta: t("common.followUp"), icon: <Bell size={19} />, color: "text-amber-600 bg-amber-50", link: "/admin/follow-up" },
    { label: t("admin.totalCandidates"), val: candidateProfiles.length, meta: `${reviewedCandidates} ${t("admin.reviewedCount")}`, icon: <TrendingUp size={19} />, color: "text-emerald-600 bg-emerald-50", link: "/admin/candidates" },
  ];

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-pink-100 bg-white px-3 py-1 text-xs font-bold text-primary">
            <Briefcase size={13} /> {t("admin.workspaceBadge")}
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
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {stats.map(s => (
          <Link key={s.label} to={s.link} className="group rounded-xl border border-border bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
            <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.color}`}>{s.icon}</div>
              <ArrowRight size={14} className="mt-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="flex min-w-0 items-end justify-between gap-2">
              <div>
                <div className="text-2xl font-black leading-none text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{s.val}</div>
                <div className="mt-1 text-xs font-semibold text-muted-foreground">{s.label}</div>
              </div>
              <span className="max-w-[55%] rounded-full bg-secondary px-2 py-1 text-right text-[10px] font-bold leading-tight text-muted-foreground">{s.meta}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        {/* Recent candidates */}
        <div className="rounded-xl border border-border bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("admin.recentCandidates")}</h2>
            <Link to="/admin/candidates" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">{t("home.ctaJobs")} <ArrowRight size={11} /></Link>
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {recentCandidates.length ? recentCandidates.map(c => (
              <Link key={c.id} to={`/admin/candidates/${c.candidateId}?application=${c.applicationId}`} className="group grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 bg-white p-3 transition-colors hover:bg-pink-50 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground font-bold text-sm flex-shrink-0">{c.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{c.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="truncate">{c.jobTitle}</span>
                    <span className="inline-flex items-center gap-1"><Clock size={11} /> {c.appliedAt}</span>
                  </div>
                </div>
                <span className={`col-start-2 w-fit flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold sm:col-start-auto ${CANDIDATE_STATUS_CONFIG[c.status].badgeClass}`}>
                  {translateCandidateStatus(c.status, language)}
                </span>
              </Link>
            )) : (
              <div className="bg-background p-4 text-sm font-semibold text-muted-foreground">{t("admin.noCandidates")}</div>
            )}
          </div>
        </div>

        {/* Priority tasks */}
        <div className="rounded-xl border border-border bg-white p-4 sm:p-5">
          <h2 className="font-black text-foreground mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>{t("admin.todayTasks")}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { icon: <AlertCircle size={15} className="text-amber-500" />, text: `${newCandidates} ${t("admin.newProfilesTask")}`, urgent: newCandidates > 0, link: "/admin/candidates" },
              { icon: <Bell size={15} className="text-blue-500" />, text: `${followUps} ${t("admin.followUpTask")}`, urgent: followUps > 0, link: "/admin/follow-up" },
              { icon: <Briefcase size={15} className="text-primary" />, text: `${draftJobs} ${t("admin.draftJobsTask")}`, urgent: false, link: "/admin/jobs" },
              { icon: <CheckCircle size={15} className="text-emerald-500" />, text: t("admin.reviewNewCandidates"), urgent: false, link: "/admin/candidates" },
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
