import { Link } from "react-router";
import {
  ArrowRight,
  Bell,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock,
  Plus,
  Radar,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { useData } from "@/app/data";
import { translateCandidateStatus, useLanguage } from "@/app/services/i18n-service";
import AdminLayout from "@/app/layouts/AdminLayout";
import { CANDIDATE_STATUS_CONFIG } from "@/app/utils/configs/status-config";

const TERMINAL_STATUSES = new Set(["rejected", "offer", "offer_closed"]);

export default function AdminDashboard() {
  const { jobs, candidates, candidateProfiles } = useData();
  const { language, t } = useLanguage();
  const today = new Date().toISOString().split("T")[0];

  const publishedJobs = jobs.filter(job => job.status === "published").length;
  const urgentOpenJobs = jobs.filter(job => job.status === "published" && job.urgent).length;
  const draftJobs = jobs.filter(job => job.status === "draft").length;
  const newCandidates = candidateProfiles.filter(profile =>
    profile.applications.some(application => application.status === "new"),
  ).length;
  const activeCandidates = candidates.filter(candidate => !TERMINAL_STATUSES.has(candidate.status));
  const overdueFollowUps = activeCandidates.filter(candidate =>
    candidate.followUpDate && candidate.followUpDate < today,
  ).length;
  const followUpCandidates = activeCandidates.filter(candidate => Boolean(candidate.followUpDate)).length;
  const completedMatches = candidates.filter(candidate => candidate.aiStatus === "completed");
  const talentPoolCandidates = candidateProfiles.filter(profile =>
    profile.applications.some(application => application.status === "talent_pool"),
  ).length;
  const recentCandidates = [...candidates]
    .sort((a, b) => b.appliedAtIso.localeCompare(a.appliedAtIso))
    .slice(0, 5);
  const topMatches = [...completedMatches]
    .sort((a, b) => b.aiScore - a.aiScore)
    .slice(0, 4);

  const priorities = [
    {
      title: t("admin.overdueFollowUps"),
      description: t("admin.overdueTaskHint"),
      priority: t("admin.priorityUrgent"),
      count: overdueFollowUps,
      link: "/admin/follow-up#overdue",
      icon: CalendarClock,
      activeClass: "border-red-200 bg-red-50/70 text-red-700",
      iconClass: "bg-red-100 text-red-700",
    },
    {
      title: t("admin.newProfilesTask"),
      description: t("admin.newProfilesTaskHint"),
      priority: t("admin.priorityReview"),
      count: newCandidates,
      link: "/admin/candidates?status=new",
      icon: Users,
      activeClass: "border-amber-200 bg-amber-50/70 text-amber-800",
      iconClass: "bg-amber-100 text-amber-700",
    },
    {
      title: t("admin.draftJobsTask"),
      description: t("admin.draftJobsTaskHint"),
      priority: t("admin.priorityPlan"),
      count: draftJobs,
      link: "/admin/jobs?status=draft",
      icon: Briefcase,
      activeClass: "border-primary/20 bg-rose-50/60 text-foreground",
      iconClass: "bg-rose-100 text-primary",
    },
  ];
  const itemsNeedAttention = priorities.reduce((sum, item) => sum + item.count, 0);

  const stats = [
    {
      label: t("admin.openJobs"),
      value: publishedJobs,
      meta: `${urgentOpenJobs} ${t("admin.urgentJobs")}`,
      link: "/admin/jobs?status=published",
      icon: Briefcase,
      tone: "bg-rose-50 text-primary",
    },
    {
      label: t("admin.newCandidates"),
      value: newCandidates,
      meta: t("admin.newCandidatesMeta"),
      link: "/admin/candidates?status=new",
      icon: Users,
      tone: "bg-blue-50 text-blue-600",
    },
    {
      label: t("admin.talentPool"),
      value: talentPoolCandidates,
      meta: t("admin.talentPoolMeta"),
      link: "/admin/candidates?status=talent_pool",
      icon: TrendingUp,
      tone: "bg-violet-50 text-violet-600",
    },
    {
      label: t("admin.needFollowUp"),
      value: followUpCandidates,
      meta: `${overdueFollowUps} ${t("admin.overdueFollowUps")}`,
      link: "/admin/follow-up",
      icon: Bell,
      tone: "bg-amber-50 text-amber-600",
    },
  ];

  const quickLinks = [
    { label: t("admin.createJob"), hint: t("admin.createJobShortcut"), link: "/admin/jobs/new", icon: Plus },
    { label: t("admin.reviewCandidateInbox"), hint: t("admin.reviewCandidateInboxHint"), link: "/admin/candidates?status=new", icon: Users },
    { label: t("admin.goToSourcing"), hint: t("admin.goToSourcingHint"), link: "/admin/sourcing", icon: Radar },
    { label: t("admin.manageFollowUps"), hint: t("admin.manageFollowUpsHint"), link: "/admin/follow-up", icon: Bell },
  ];

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1480px]">
        <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-primary">
              <Sparkles size={13} aria-hidden="true" />
              {t("admin.workspaceBadge")}
            </div>
            <h1 className="text-2xl font-extrabold leading-tight text-foreground sm:text-[28px]">
              {t("admin.commandCenter")}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("admin.dashboardGreeting")}</p>
          </div>
          <Link
            to="/admin/jobs/new"
            className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Plus size={16} aria-hidden="true" />
            {t("admin.createJob")}
          </Link>
        </header>

        <div className="mb-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
          <div className="min-w-0 space-y-5">
            <section className="self-start overflow-hidden rounded-2xl border border-border bg-white" aria-labelledby="attention-title">
              <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${itemsNeedAttention ? "bg-red-500" : "bg-emerald-500"}`} />
                    <h2 id="attention-title" className="text-base font-extrabold text-foreground sm:text-lg">
                      {t("admin.attentionTitle")}
                    </h2>
                  </div>
                </div>
                <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${itemsNeedAttention ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                  {itemsNeedAttention ? `${itemsNeedAttention} ${t("admin.itemsNeedAttention")}` : t("admin.allCaughtUp")}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 p-2 sm:grid-cols-3">
                {priorities.map(item => {
                  const Icon = item.icon;
                  const isActive = item.count > 0;
                  return (
                    <Link
                      key={item.title}
                      to={item.link}
                      className={`group relative flex min-h-[88px] min-w-0 items-center gap-3 rounded-xl border p-3 transition hover:bg-rose-50/40 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary ${isActive ? item.activeClass : "border-border bg-white text-muted-foreground"}`}
                    >
                      <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${isActive ? item.iconClass : "bg-secondary text-emerald-600"}`}>
                        {isActive ? <Icon size={19} aria-hidden="true" /> : <CheckCircle2 size={19} aria-hidden="true" />}
                      </span>
                      <span className="min-w-0 flex-1 pr-10">
                        <span className="flex flex-wrap items-center gap-1.5 pr-1">
                          <span className="text-sm font-extrabold leading-tight">{item.title}</span>
                          {isActive && (
                            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide opacity-75">
                              {item.priority}
                            </span>
                          )}
                        </span>
                      </span>
                      <span className={`absolute right-4 top-1/2 flex h-8 min-w-8 -translate-y-1/2 items-center justify-center rounded-full px-2 text-xs font-extrabold ${isActive ? "bg-white shadow-sm" : "bg-secondary"}`}>
                        {item.count}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>


            <section className="mb-5" aria-labelledby="snapshot-title">
              <h2 id="snapshot-title" className="mb-2 text-sm font-extrabold text-foreground">{t("admin.performanceSnapshot")}</h2>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {stats.map(stat => {
                  const Icon = stat.icon;
                  return (
                    <Link
                      key={stat.label}
                      to={stat.link}
                      className="group flex min-h-[88px] min-w-0 items-center gap-2.5 rounded-xl border border-border bg-white p-3 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-xl ${stat.tone}`}>
                        <Icon size={16} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-lg font-extrabold leading-none text-foreground">{stat.value}</span>
                        <span className="mt-1 block truncate text-[10px] font-extrabold uppercase tracking-[0.08em] text-foreground">{stat.label}</span>
                        <span className="mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground" title={stat.meta}>{stat.meta}</span>
                      </span>
                      <ArrowRight size={14} className="text-muted-foreground/40 transition group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>

          <section className="self-start rounded-2xl border border-border bg-white p-4" aria-labelledby="quick-access-title">
            <h2 id="quick-access-title" className="mb-3 text-base font-extrabold text-foreground">{t("admin.quickAccess")}</h2>
            <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 xl:grid-cols-1">
              {quickLinks.map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    to={item.link}
                    className="group flex min-h-12 items-center gap-2.5 rounded-xl border border-border px-3 py-2 transition hover:border-primary/30 hover:bg-rose-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-secondary text-primary">
                      <Icon size={17} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-foreground">{item.label}</span>
                    </span>
                    <ArrowRight size={14} className="flex-none text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-white" aria-labelledby="recent-title">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
              <div>
                <h2 id="recent-title" className="text-base font-extrabold text-foreground sm:text-lg">{t("admin.recentCandidates")}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("admin.recentCandidatesHint")}</p>
              </div>
              <Link to="/admin/candidates" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                {t("admin.viewAll")} <ArrowRight size={13} />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentCandidates.length ? recentCandidates.map(candidate => (
                <Link
                  key={candidate.id}
                  to={`/admin/candidates/${candidate.candidateId}?application=${candidate.applicationId}`}
                  className="group grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-3 transition hover:bg-rose-50/40 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:px-5"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-sm font-extrabold text-primary">{candidate.name.charAt(0)}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-extrabold text-foreground group-hover:text-primary">{candidate.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{candidate.jobTitle}</span>
                  </span>
                  <span className="col-start-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground sm:col-start-auto">
                    <Clock size={11} /> {candidate.appliedAt}
                  </span>
                  <span className={`col-start-2 w-fit rounded-full border px-2.5 py-1 text-[10px] font-bold sm:col-start-auto ${CANDIDATE_STATUS_CONFIG[candidate.status].badgeClass}`}>
                    {translateCandidateStatus(candidate.status, language)}
                  </span>
                </Link>
              )) : <EmptyState text={t("admin.noCandidates")} />}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-white" aria-labelledby="matches-title">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
              <div>
                <h2 id="matches-title" className="text-base font-extrabold text-foreground sm:text-lg">{t("admin.topAiMatches")}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("admin.topAiMatchesHint")}</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Sparkles size={18} /></span>
            </div>
            {topMatches.length ? (
              <div className="divide-y divide-border">
                {topMatches.map(candidate => (
                  <Link
                    key={candidate.id}
                    to={`/admin/candidates/${candidate.candidateId}?application=${candidate.applicationId}`}
                    className="group block px-4 py-3 transition hover:bg-rose-50/40 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary sm:px-5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-sm font-extrabold text-primary">{candidate.name.charAt(0)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold text-foreground group-hover:text-primary">{candidate.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{candidate.jobTitle}</span>
                      </span>
                      <span className={`text-base font-extrabold ${candidate.aiScore >= 80 ? "text-emerald-600" : "text-amber-600"}`}>{candidate.aiScore}%</span>
                      <ArrowRight size={14} className="text-muted-foreground/40 transition group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>
                    <div className="ml-12 mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full ${candidate.aiScore >= 80 ? "bg-emerald-500" : "bg-amber-500"}`}
                        style={{ width: `${Math.min(candidate.aiScore, 100)}%` }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            ) : <EmptyState text={t("admin.noCandidates")} />}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="px-5 py-10 text-center text-sm font-semibold text-muted-foreground">{text}</div>;
}
