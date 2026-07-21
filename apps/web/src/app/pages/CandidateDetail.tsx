import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import {
  Briefcase,
  Calendar,
  Check,
  ChevronLeft,
  ClipboardList,
  ExternalLink,
  FileText,
  History,
  Mail,
  MapPin,
  MessageSquare,
  NotebookPen,
  Phone,
  Save,
  UserRound,
} from "lucide-react";
import {
  CvPreviewPanel,
  getInitials,
  InfoItem,
  SectionHeading,
} from "@/app/components/CandidateDetailSections";
import { useData } from "@/app/data";
import { translateCandidateStatus, useLanguage } from "@/app/i18n";
import AdminLayout from "@/app/layouts/AdminLayout";
import {
  CANDIDATE_STATUS_CONFIG,
  CANDIDATE_WORKFLOW_STATUSES,
  type CandidateStatus,
} from "@/app/status-config";

export default function CandidateDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { candidateProfiles, isLoading, updateCandidate } = useData();
  const { language, t } = useLanguage();
  const candidate = candidateProfiles.find(profile => profile.id === id);
  const requestedApplicationId = searchParams.get("application");
  const selectedApplication = candidate?.applications.find(application => application.id === requestedApplicationId)
    ?? candidate?.applications[0];
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [saved, setSaved] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedApplication) return;
    setNote(selectedApplication.hrNote || "");
    setFollowUp(selectedApplication.followUpDate || "");
    setError("");
  }, [selectedApplication]);

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

  const hasCv = Boolean(application.cvUrl && application.cvUrl !== "#");
  const primaryEmail = candidate.email || application.email || "—";
  const primaryPhone = candidate.phone || application.phone || "—";

  return (
    <AdminLayout>
      <div className="w-full max-w-[1560px] space-y-4">
        <header className="sticky top-16 z-20 overflow-hidden rounded-2xl border border-border/80 bg-white shadow-[0_10px_30px_rgba(120,70,86,0.06)]">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <div className="flex size-12 flex-none items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">
                {getInitials(candidate.name)}
              </div>
              <div className="min-w-0">
                <Link to="/admin/candidates" className="mb-1 inline-flex items-center gap-1 text-xs font-bold text-muted-foreground transition-colors hover:text-primary">
                  <ChevronLeft size={14} /> {t("common.backToList")}
                </Link>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-black leading-tight text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {candidate.name}
                  </h1>
                  <StatusBadge status={application.status} language={language} />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-muted-foreground">
                  <span className="truncate text-foreground">{application.jobTitle}</span>
                  <span aria-hidden="true">·</span>
                  <span>{t("admin.appliedDate")} {application.appliedAt || "—"}</span>
                  <span aria-hidden="true">·</span>
                  <span>{candidate.applications.length} {t("admin.applications")}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center lg:justify-end">
              {application.email && (
                <a href={`mailto:${application.email}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-white px-3.5 text-xs font-bold text-muted-foreground hover:border-primary/40 hover:text-primary">
                  <Mail size={15} /> Email
                </a>
              )}
              <Link to={`/admin/chats?candidate=${application.id}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-white px-3.5 text-xs font-bold text-muted-foreground hover:border-primary/40 hover:text-primary">
                <MessageSquare size={15} /> Mở chat
              </Link>
              {hasCv && (
                <a href={application.cvUrl} target="_blank" rel="noopener noreferrer" className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-white shadow-sm hover:bg-primary/90 sm:col-span-1">
                  <FileText size={15} /> {t("common.openCv")} <ExternalLink size={13} />
                </a>
              )}
            </div>
          </div>
        </header>

        {candidate.applications.length > 1 && (
          <ApplicationHistory
            applications={candidate.applications}
            selectedId={application.id}
            onSelect={applicationId => setSearchParams({ application: applicationId }, { replace: true })}
            title={t("admin.applicationHistory")}
            language={language}
          />
        )}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(500px,560px)] 2xl:grid-cols-[minmax(0,1fr)_620px]">
          <main className="min-w-0 space-y-5">
            <section className="rounded-2xl border border-border/80 bg-white p-4 shadow-[0_10px_30px_rgba(120,70,86,0.04)] sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <SectionHeading icon={<UserRound size={16} />} title={t("admin.personalInfo")} />
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={application.status} language={language} />
                </div>
              </div>
              <dl className="mt-4 grid gap-3 md:grid-cols-2">
                <InfoItem icon={<Mail size={14} />} label={t("common.email")} value={primaryEmail} />
                <InfoItem icon={<Phone size={14} />} label={t("admin.phone")} value={primaryPhone} />
                <InfoItem icon={<MapPin size={14} />} label={t("admin.applicationArea")} value={application.applicationArea || "—"} />
                <InfoItem icon={<Briefcase size={14} />} label={t("admin.appliedRole")} value={application.jobTitle} />
              </dl>
              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="min-w-0 rounded-xl border border-border/80 bg-background/60 p-4">
                  <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                    <NotebookPen size={13} className="text-primary" /> {t("admin.coverNote")}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{application.coverNote || "—"}</p>
                </div>
                <ScreeningAnswers answers={application.screeningAnswers} title={t("admin.screeningQuestions")} />
              </div>
            </section>

            <section className="rounded-2xl border border-border/80 bg-white p-4 shadow-[0_10px_30px_rgba(120,70,86,0.04)] sm:p-5">
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

          <aside className="min-w-0 xl:sticky xl:top-36">
            <CvPreviewPanel candidate={application} t={t} />
          </aside>
        </div>
      </div>
    </AdminLayout>
  );
}

function StatusBadge({ status, language }: { status: CandidateStatus; language: "vi" | "en" }) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${CANDIDATE_STATUS_CONFIG[status].badgeClass}`}>
      {translateCandidateStatus(status, language)}
    </span>
  );
}

function ApplicationHistory({ applications, selectedId, onSelect, title, language }: {
  applications: ReturnType<typeof useData>["candidates"];
  selectedId: string;
  onSelect: (applicationId: string) => void;
  title: string;
  language: "vi" | "en";
}) {
  return (
    <section className="rounded-2xl border border-border/80 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(120,70,86,0.04)]">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
        <History size={13} /> {title}
      </div>
      <div className="scrollbar-horizontal flex gap-2 overflow-x-auto">
        {applications.map(application => (
          <button key={application.id} type="button" onClick={() => onSelect(application.id)} aria-pressed={application.id === selectedId} className={`grid min-w-52 flex-shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all sm:min-w-56 ${application.id === selectedId ? "border-primary/30 bg-primary/5 text-foreground shadow-sm" : "border-border/70 bg-white text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}>
            <span className="min-w-0">
              <span className="block truncate text-xs font-black">{application.jobTitle}</span>
              <span className="mt-0.5 block text-[10px] font-semibold">{application.appliedAt || "—"}</span>
            </span>
            <span className={`rounded-full border px-2 py-1 text-[11px] font-black ${CANDIDATE_STATUS_CONFIG[application.status].badgeClass}`}>
              {translateCandidateStatus(application.status, language)}
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
