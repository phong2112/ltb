import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import {
  AlertTriangle,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle,
  ChevronLeft,
  ClipboardList,
  FileText,
  GraduationCap,
  History,
  Languages,
  Mail,
  MapPin,
  MessageSquare,
  NotebookPen,
  Phone,
  RefreshCw,
  Save,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import {
  AnalysisGroup,
  CvPreviewPanel,
  getInitials,
  InfoItem,
  SectionHeading,
} from "@/app/components/CandidateDetailSections";
import ScrollToTopButton from "@/app/components/ScrollToTopButton";
import { useData } from "@/app/data";
import { translateCandidateStatus, useLanguage } from "@/app/services/i18n-service";
import AdminLayout from "@/app/layouts/AdminLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/Common/alert-dialog";
import {
  CANDIDATE_STATUS_CONFIG,
  CANDIDATE_WORKFLOW_STATUSES,
  type CandidateStatus,
} from "@/app/utils/configs/status-config";

export default function CandidateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { candidateProfiles, isLoading, refreshCandidateAnalysis, retryCandidateAnalysis, updateCandidate, deleteCandidate } = useData();
  const { language, t } = useLanguage();
  const candidate = candidateProfiles.find(profile => profile.id === id);
  const requestedApplicationId = searchParams.get("application");
  const selectedApplication = candidate?.applications.find(application => application.id === requestedApplicationId)
    ?? candidate?.applications[0];
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [saved, setSaved] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [retryingAnalysis, setRetryingAnalysis] = useState(false);
  const [copiedContactKey, setCopiedContactKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const autoViewedApplicationId = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedApplication) return;
    setNote(selectedApplication.hrNote || "");
    setFollowUp(selectedApplication.followUpDate || "");
    setError("");
  }, [selectedApplication]);

  useEffect(() => {
    if (selectedApplication?.aiStatus !== "pending") return;
    const interval = window.setInterval(() => {
      void refreshCandidateAnalysis(selectedApplication.applicationId).catch(() => undefined);
    }, 5_000);
    return () => window.clearInterval(interval);
  }, [selectedApplication?.aiStatus, selectedApplication?.applicationId, refreshCandidateAnalysis]);

  useEffect(() => {
    if (!selectedApplication || selectedApplication.status !== "new") return;
    if (autoViewedApplicationId.current === selectedApplication.applicationId) return;

    autoViewedApplicationId.current = selectedApplication.applicationId;
    void updateCandidate(selectedApplication.id, { status: "viewed" }).catch(markViewedError => {
      autoViewedApplicationId.current = null;
      setError(markViewedError instanceof Error ? markViewedError.message : "Không cập nhật được trạng thái đã xem");
    });
  }, [selectedApplication, updateCandidate]);

  if (!candidate && isLoading) {
    return (
      <AdminLayout>
        <div className="py-32 text-center text-sm font-semibold text-muted-foreground">Đang tải ứng viên...</div>
      </AdminLayout>
    );
  }

  if (!candidate || !selectedApplication) {
    return (
      <AdminLayout>
        <div className="py-32 text-center">
          <p className="text-xl font-bold">{t("admin.candidateNotFound")}</p>
          <Link to="/admin/candidates" className="text-sm text-primary underline">{t("common.backToList")}</Link>
        </div>
      </AdminLayout>
    );
  }

  const application = selectedApplication;

  async function handleSave() {
    setError("");
    try {
      await updateCandidate(application.id, { hrNote: note, followUpDate: followUp });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2_000);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không lưu được ghi chú");
    }
  }

  async function handleStatusChange(status: CandidateStatus) {
    if (status === application.status) return;
    setError("");
    setStatusUpdating(true);
    try {
      await updateCandidate(application.id, { status });
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Không cập nhật được trạng thái");
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleRetryAnalysis() {
    setError("");
    setRetryingAnalysis(true);
    try {
      await retryCandidateAnalysis(application.applicationId);
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "Không chạy lại được phân tích AI");
    } finally {
      setRetryingAnalysis(false);
    }
  }

  async function handleDeleteCandidate() {
    if (!candidate || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteCandidate(candidate.id);
      navigate("/admin/candidates", { replace: true });
    } finally {
      setIsDeleting(false);
    }
  }

  async function copyContactValue(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopiedContactKey(key);
    window.setTimeout(() => setCopiedContactKey(current => (current === key ? null : current)), 1600);
  }

  const scoreTone = application.aiStatus !== "completed"
    ? { text: "text-slate-600", soft: "bg-slate-50", border: "border-slate-200", bar: "bg-slate-400" }
    : application.aiScore >= 90
      ? { text: "text-emerald-700", soft: "bg-emerald-50", border: "border-emerald-200", bar: "bg-emerald-500" }
      : application.aiScore >= 75
        ? { text: "text-amber-700", soft: "bg-amber-50", border: "border-amber-200", bar: "bg-amber-500" }
        : application.aiScore >= 60
          ? { text: "text-orange-700", soft: "bg-orange-50", border: "border-orange-200", bar: "bg-orange-500" }
          : { text: "text-red-700", soft: "bg-red-50", border: "border-red-200", bar: "bg-red-500" };
  const primaryEmail = candidate.email || application.email || "—";
  const primaryPhone = candidate.phone || application.phone || "—";
  const emailCopyValue = primaryEmail === "—" ? undefined : primaryEmail;
  const phoneCopyValue = primaryPhone === "—" ? undefined : primaryPhone;
  const scoreValue = Math.max(0, Math.min(application.aiScore, 100));
  const scoreLabel = application.aiStatus === "completed"
    ? `${application.aiScore}/100`
    : application.aiStatus === "pending" ? "Đang phân tích" : "Chưa có kết quả";
  const aiReviewTone = application.aiReview.tone === "good"
    ? {
        border: "border-emerald-200",
        bg: "bg-emerald-50",
        text: "text-emerald-800",
        icon: "text-emerald-600",
        dot: "bg-emerald-500",
        iconNode: <CheckCircle size={15} />,
      }
    : application.aiReview.tone === "fair"
      ? {
          border: "border-amber-200",
          bg: "bg-amber-50",
          text: "text-amber-800",
          icon: "text-amber-600",
          dot: "bg-amber-500",
          iconNode: <AlertTriangle size={15} />,
        }
      : {
          border: "border-red-200",
          bg: "bg-red-50",
          text: "text-red-800",
          icon: "text-red-600",
          dot: "bg-red-500",
          iconNode: <AlertTriangle size={15} />,
        };

  return (
    <AdminLayout>
      <div className="w-full max-w-[1560px] space-y-4">
        <header className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-[0_10px_30px_rgba(120,70,86,0.06)]">
          <div className="flex flex-col gap-3 px-3.5 py-3.5 sm:px-5 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <div className="flex size-11 flex-none items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary sm:size-12">
                {getInitials(candidate.name)}
              </div>
              <div className="min-w-0">
                <Link to="/admin/candidates" className="mb-1 inline-flex items-center gap-1 text-xs font-bold text-muted-foreground transition-colors hover:text-primary">
                  <ChevronLeft size={14} /> {t("common.backToList")}
                </Link>
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <h1 className="max-w-full truncate text-[1.65rem] font-black leading-none text-foreground sm:text-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {candidate.name}
                  </h1>
                  <StatusBadge status={application.status} language={language} />
                </div>
                <div className="mt-1.5 flex flex-col gap-0.5 text-sm font-semibold leading-5 text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1 sm:text-xs">
                  <span className="line-clamp-1 text-foreground">{application.jobTitle}</span>
                  <span className="hidden sm:inline" aria-hidden="true">·</span>
                  <span>{t("admin.appliedDate")} {application.appliedAt || "—"}</span>
                  <span className="hidden sm:inline" aria-hidden="true">·</span>
                  <span>{candidate.applications.length} {t("admin.applications")}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center lg:justify-end">
              <Link to={`/admin/chats?candidate=${application.id}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 text-xs font-bold text-muted-foreground hover:border-primary/40 hover:text-primary">
                <MessageSquare size={15} /> Mở chat
              </Link>
              <button type="button" onClick={() => setDeleteOpen(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-xs font-bold text-red-700 hover:bg-red-50">
                <Trash2 size={15} /> {t("admin.deleteCandidate")}
              </button>
            </div>
          </div>
        </header>

        {candidate.applications.length > 1 && (
          <ApplicationHistory
            applications={candidate.applications}
            selectedId={application.id}
            onSelect={applicationId => setSearchParams({ application: applicationId }, { replace: true })}
            title={t("admin.applicationHistory")}
          />
        )}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(620px,1fr)_minmax(420px,500px)] 2xl:grid-cols-[minmax(720px,1fr)_560px]">
          <main className="min-w-0 space-y-5">
            <section className="rounded-2xl border border-border/80 bg-white p-4 shadow-[0_10px_30px_rgba(120,70,86,0.04)] sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <SectionHeading icon={<UserRound size={16} />} title={t("admin.personalInfo")} />
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={application.status} language={language} />
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${scoreTone.soft} ${scoreTone.border} ${scoreTone.text}`}>
                    {t("admin.matchScore")} {scoreLabel}
                  </span>
                </div>
              </div>
              <dl className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-2">
                <InfoItem
                  icon={<Mail size={14} />}
                  label={t("common.email")}
                  value={primaryEmail}
                  copied={copiedContactKey === "email"}
                  copyLabel={copiedContactKey === "email" ? t("common.copied") : t("admin.copyCandidateEmail")}
                  copyValue={emailCopyValue}
                  onCopy={emailCopyValue ? () => void copyContactValue("email", emailCopyValue) : undefined}
                />
                <InfoItem
                  icon={<Phone size={14} />}
                  label={t("admin.phone")}
                  value={primaryPhone}
                  copied={copiedContactKey === "phone"}
                  copyLabel={copiedContactKey === "phone" ? t("common.copied") : t("common.copy")}
                  copyValue={phoneCopyValue}
                  onCopy={phoneCopyValue ? () => void copyContactValue("phone", phoneCopyValue) : undefined}
                />
                <InfoItem icon={<MapPin size={14} />} label={t("admin.applicationArea")} value={application.applicationArea || "—"} />
                <InfoItem icon={<Briefcase size={14} />} label={t("admin.appliedRole")} value={application.jobTitle} />
              </dl>
              <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                <div className="min-w-0 rounded-xl border border-border/80 bg-background/60 p-4">
                  <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                    <NotebookPen size={13} className="text-primary" /> {t("admin.coverNote")}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{application.coverNote || "—"}</p>
                </div>
                <ScreeningAnswers answers={application.screeningAnswers} title={t("admin.screeningQuestions")} />
              </div>
            </section>

            <CvSummarySection application={application} />

            <section className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-[0_10px_30px_rgba(120,70,86,0.04)]">
              <div className="grid gap-5 border-b border-border px-5 py-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="min-w-0">
                  <SectionHeading icon={<Sparkles size={16} />} title={t("common.aiAnalysis")} />
                  <p className="mt-3 max-w-4xl text-sm leading-6 text-foreground">{application.aiSummary}</p>
                  {application.aiStatus === "completed" && application.aiConfidence !== null && (
                    <p className="mt-2 text-xs font-semibold text-muted-foreground">Độ tin cậy của bằng chứng: {application.aiConfidence}%</p>
                  )}
                  <div className={`mt-3 rounded-xl border p-3 ${aiReviewTone.border} ${aiReviewTone.bg}`}>
                    <div className="flex items-center gap-2">
                      <span className={aiReviewTone.icon}>{aiReviewTone.iconNode}</span>
                      <span className={`text-xs font-black ${aiReviewTone.text}`}>{application.aiReview.label}</span>
                    </div>
                    <p className="mt-1.5 text-xs font-medium leading-5 text-muted-foreground">{application.aiReview.note}</p>
                    {application.aiReview.signals.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {application.aiReview.signals.map(signal => (
                          <span key={signal} className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/80 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                            <span className={`size-1.5 rounded-full ${aiReviewTone.dot}`} />
                            {signal}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {application.aiStatus === "failed" && application.aiError && (
                    <p className="mt-2 text-xs font-semibold text-red-600">{application.aiError}</p>
                  )}
                  {application.aiStatus === "failed" && (
                    <button
                      type="button"
                      disabled={retryingAnalysis}
                      onClick={() => void handleRetryAnalysis()}
                      className="mt-3 inline-flex h-8 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-black text-red-700 transition-colors hover:border-red-300 hover:bg-red-100 disabled:cursor-wait disabled:opacity-60"
                    >
                      <RefreshCw size={13} className={retryingAnalysis ? "animate-spin" : undefined} />
                      Chạy lại AI
                    </button>
                  )}
                </div>
                <div className={`rounded-2xl border p-4 ${scoreTone.soft} ${scoreTone.border}`}>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">{t("admin.matchScore")}</p>
                      <p className={`mt-1 text-4xl font-black leading-none ${scoreTone.text}`} style={{ fontFamily: "'Playfair Display', serif" }}>
                        {application.aiStatus === "completed" ? application.aiScore : "—"}
                        {application.aiStatus === "completed" && <span className="ml-1 text-sm font-bold text-muted-foreground">/100</span>}
                      </p>
                    </div>
                    <Target size={24} className={scoreTone.text} />
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80">
                    <div className={`h-full rounded-full ${scoreTone.bar}`} style={{ width: `${application.aiStatus === "completed" ? scoreValue : 0}%` }} />
                  </div>
                </div>
              </div>
              <div className="grid divide-y divide-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
                <AnalysisGroup icon={<CheckCircle size={14} />} title={t("admin.strengths")} items={application.strengths} emptyText="—" tone="text-emerald-700" bulletClass="bg-emerald-500" />
                <AnalysisGroup icon={<AlertTriangle size={14} />} title={t("admin.risks")} items={application.risks} emptyText={t("admin.noRisk")} tone="text-amber-700" bulletClass="bg-amber-500" />
                <AnalysisGroup icon={<XCircle size={14} />} title={t("admin.missingRequirements")} items={application.missingReqs} emptyText={t("admin.meetsRequirements")} tone="text-red-600" bulletClass="bg-red-500" />
              </div>
            </section>

            <section className="rounded-2xl border border-border/80 bg-white p-5 shadow-[0_10px_30px_rgba(120,70,86,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <SectionHeading icon={<Calendar size={16} />} title={`${t("admin.status")} & ${t("common.followUp")}`} />
                <StatusBadge status={application.status} language={language} />
              </div>
              <div className="mt-4">
                <div className="flex flex-wrap gap-2">
                  {CANDIDATE_WORKFLOW_STATUSES.map(status => {
                    const active = status === application.status;
                    return (
                      <button
                        key={status}
                        type="button"
                        disabled={statusUpdating}
                        onClick={() => void handleStatusChange(status)}
                        aria-pressed={active}
                        className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-black leading-none transition-all disabled:cursor-wait disabled:opacity-60 ${active ? CANDIDATE_STATUS_CONFIG[status].badgeClass : "border-border bg-white text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"}`}
                      >
                        {translateCandidateStatus(status, language)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="min-w-0">
                  <label htmlFor="candidate-follow-up" className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                    <Calendar size={12} /> {t("common.followUp")}
                  </label>
                  <input id="candidate-follow-up" type="date" value={followUp} onChange={event => setFollowUp(event.target.value)} className="h-10 w-full rounded-xl border border-border bg-input-background px-3 text-sm text-foreground outline-none focus:border-primary" />
                </div>
                <div className="min-w-0">
                  <label htmlFor="candidate-note" className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">{t("admin.hrNote")}</label>
                  <textarea id="candidate-note" rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder={t("admin.notePlaceholder")} className="w-full resize-none rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm leading-5 text-foreground outline-none focus:border-primary" />
                </div>
                <button type="button" onClick={() => void handleSave()} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-white shadow-sm hover:bg-primary/90 lg:col-start-2 lg:w-fit lg:justify-self-end">
                  {saved ? <Check size={15} /> : <Save size={15} />}{t(saved ? "admin.saved" : "admin.saveNote")}
                </button>
                {error && <p className="text-xs font-semibold text-red-500 lg:col-span-2" role="alert">{error}</p>}
              </div>
            </section>
          </main>

          <aside className="min-w-0 xl:sticky xl:top-20">
            <CvPreviewPanel candidate={application} t={t} />
          </aside>
        </div>
      </div>
      <ScrollToTopButton />
      <AlertDialog open={deleteOpen} onOpenChange={open => { if (!isDeleting) setDeleteOpen(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.deleteCandidateTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.deleteCandidateDescription")} <strong>{candidate.name}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("admin.cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={() => void handleDeleteCandidate()} className="bg-red-600 text-white hover:bg-red-700">
              {isDeleting ? t("admin.deletingCandidate") : t("admin.deleteCandidate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

function CvSummarySection({ application }: { application: ReturnType<typeof useData>["candidates"][number] }) {
  const summary = application.cvSummary;
  const workCompanies = summary ? getWorkCompanies(summary) : [];

  return (
    <section className="rounded-2xl border border-border/80 bg-white p-5 shadow-[0_10px_30px_rgba(120,70,86,0.04)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <SectionHeading icon={<FileText size={16} />} title="Tóm tắt CV" />
          <p className="mt-3 max-w-4xl text-sm leading-6 text-foreground">
            {summary?.overview ?? (application.aiStatus === "failed" ? "AI chưa tóm tắt được CV này. TA có thể mở file CV để xem trực tiếp." : "Tóm tắt CV sẽ hiển thị sau khi AI đọc xong hồ sơ.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {summary?.currentTitle && <SummaryPill label={summary.currentTitle} />}
          {summary?.totalExperience && <SummaryPill label={summary.totalExperience} />}
        </div>
      </div>

      {summary && (
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <CvSummaryList icon={<Sparkles size={14} />} title="Kỹ năng chính" items={summary.keySkills} inline />
            <CvSummaryList icon={<NotebookPen size={14} />} title="Ghi chú nhanh cho TA" items={summary.notesForTa} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-4">
              <CvSummaryList icon={<GraduationCap size={14} />} title="Học vấn" items={summary.education} />
              <CvSummaryList icon={<Languages size={14} />} title="Ngôn ngữ" items={summary.languages} inline />
              <CvSummaryList icon={<Building2 size={14} />} title="Các công ty đã làm việc" items={workCompanies} inline />
            </div>
            <CvSummaryList icon={<Briefcase size={14} />} title="Kinh nghiệm nổi bật" items={summary.workHighlights} />
          </div>
        </div>
      )}
    </section>
  );
}

function getWorkCompanies(summary: NonNullable<ReturnType<typeof useData>["candidates"][number]["cvSummary"]>) {
  const explicitCompanies = summary.workCompanies?.filter(Boolean) ?? [];
  if (explicitCompanies.length > 0) return Array.from(new Set(explicitCompanies));

  const companyPattern = /(?:\bat\b|\b@|\btại\b|\bở\b)\s+([^,.;|()]+(?:\s+(?:JSC|LLC|Ltd|Limited|Inc|Corp|Corporation|Company|Co\.?|Group|Bank|University|FPT|VNPT|Viettel|Synology|QNAP))?)/iu;
  const companies = summary.workHighlights
    .map(item => item.match(companyPattern)?.[1]?.trim())
    .filter((company): company is string => Boolean(company));

  return Array.from(new Set(companies));
}

function SummaryPill({ label }: { label: string }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
      <span className="truncate">{label}</span>
    </span>
  );
}

function CvSummaryList({ icon, title, items, inline = false }: {
  icon: ReactNode;
  title: string;
  items: string[];
  inline?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border/80 bg-background/60 p-4">
      <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
        <span className="text-primary">{icon}</span> {title}
      </p>
      {items.length > 0 ? (
        inline ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {items.map(item => (
              <span key={item} className="max-w-full rounded-full border border-border bg-white px-2.5 py-1 text-xs font-bold text-foreground">
                {item}
              </span>
            ))}
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {items.map(item => (
              <li key={item} className="grid grid-cols-[8px_minmax(0,1fr)] gap-2 text-sm leading-6 text-foreground">
                <span className="mt-2 size-1.5 rounded-full bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )
      ) : (
        <p className="mt-3 text-sm font-semibold text-muted-foreground">—</p>
      )}
    </div>
  );
}

function StatusBadge({ status, language }: { status: CandidateStatus; language: "vi" | "en" }) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${CANDIDATE_STATUS_CONFIG[status].badgeClass}`}>
      {translateCandidateStatus(status, language)}
    </span>
  );
}

function ApplicationHistory({ applications, selectedId, onSelect, title }: {
  applications: ReturnType<typeof useData>["candidates"];
  selectedId: string;
  onSelect: (applicationId: string) => void;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-border/80 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(120,70,86,0.04)]">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
        <History size={13} /> {title}
      </div>
      <div className="scrollbar-horizontal flex gap-2 overflow-x-auto">
        {applications.map(application => (
          <button key={application.id} type="button" onClick={() => onSelect(application.id)} aria-pressed={application.id === selectedId} className={`grid min-w-56 flex-shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all ${application.id === selectedId ? "border-primary/30 bg-primary/5 text-foreground shadow-sm" : "border-border/70 bg-white text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}>
            <span className="min-w-0">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-xs font-black">{application.jobTitle}</span>
                {application.status === "new" && (
                  <span className="size-1.5 flex-none rounded-full bg-blue-500 ring-4 ring-blue-50" />
                )}
              </span>
              <span className="mt-0.5 block text-[10px] font-semibold">{application.appliedAt || "—"}</span>
            </span>
            <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-primary ring-1 ring-border">
              {application.aiStatus === "completed" ? `${application.aiScore}%` : "AI…"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ScreeningAnswers({ answers, title }: {
  answers: { q: string; a: string; required?: boolean }[];
  title: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border/80 bg-background/60 p-4">
      <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
        <ClipboardList size={13} className="text-primary" /> {title}
      </p>
      {answers.length > 0 ? (
        <div className="mt-3 divide-y divide-border">
          {answers.map((answer, index) => (
            <div key={`${answer.q}-${index}`} className="py-3 first:pt-0 last:pb-0">
              <p className="flex flex-wrap items-start gap-x-2 gap-y-1 text-xs font-bold leading-5 text-muted-foreground">
                <span><span className="mr-1 text-primary">{String(index + 1).padStart(2, "0")}.</span> {answer.q}</span>
                {answer.required !== undefined && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${answer.required ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                    {answer.required ? "Bắt buộc" : "Không bắt buộc"}
                  </span>
                )}
              </p>
              <p className="mt-1.5 text-sm leading-6 text-foreground">{answer.a || "Chưa trả lời"}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-muted-foreground">—</p>
      )}
    </div>
  );
}
