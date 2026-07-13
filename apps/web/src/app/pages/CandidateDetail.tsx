import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  Check,
  CheckCircle,
  ChevronLeft,
  Copy,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Save,
  Sparkles,
  UserRound,
  XCircle,
} from "lucide-react";
import { useData, type Candidate } from "@/app/data";
import { translateCandidateStatus, useLanguage, type TranslationKey } from "@/app/i18n";
import AdminLayout from "@/app/layouts/AdminLayout";
import {
  CANDIDATE_STATUSES,
  CANDIDATE_STATUS_CONFIG,
  type CandidateStatus,
} from "@/app/status-config";

export default function CandidateDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { candidateProfiles, isLoading, updateCandidate } = useData();
  const { language, t } = useLanguage();
  const candidate = candidateProfiles.find(profile => profile.id === id);
  const requestedApplicationId = searchParams.get("application");
  const c = candidate?.applications.find(application => application.id === requestedApplicationId) ?? candidate?.applications[0];
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!c) return;
    setNote(c.hrNote || "");
    setFollowUp(c.followUpDate || "");
    setError("");
  }, [c]);

  if (!candidate && isLoading) return (
    <AdminLayout>
      <div className="py-32 text-center text-sm font-semibold text-muted-foreground">Đang tải ứng viên...</div>
    </AdminLayout>
  );

  if (!candidate || !c) return (
    <AdminLayout>
      <div className="py-32 text-center">
        <p className="text-xl font-bold">{t("admin.candidateNotFound")}</p>
        <Link to="/admin/candidates" className="text-sm text-primary underline">{t("common.backToList")}</Link>
      </div>
    </AdminLayout>
  );

  async function handleSave() {
    if (!c) return;
    setError("");

    try {
      await updateCandidate(c.id, { hrNote: note, followUpDate: followUp });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được ghi chú");
    }
  }

  async function handleStatusChange(status: CandidateStatus) {
    if (!c || status === c.status) return;
    setError("");
    setStatusUpdating(true);

    try {
      await updateCandidate(c.id, { status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được trạng thái");
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleCopyEmail() {
    try {
      await navigator.clipboard.writeText(c.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Không thể sao chép email");
    }
  }

  const scoreTone = c.aiScore >= 90
    ? { text: "text-emerald-700", soft: "bg-emerald-50", border: "border-emerald-200" }
    : c.aiScore >= 75
      ? { text: "text-amber-700", soft: "bg-amber-50", border: "border-amber-200" }
      : c.aiScore >= 60
        ? { text: "text-orange-700", soft: "bg-orange-50", border: "border-orange-200" }
        : { text: "text-red-700", soft: "bg-red-50", border: "border-red-200" };
  const hasCv = Boolean(c.cvUrl && c.cvUrl !== "#");

  return (
    <AdminLayout>
      <div className="mx-auto max-w-[1360px] space-y-5">
        <Link
          to="/admin/candidates"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-primary"
        >
          <ChevronLeft size={15} /> {t("common.backToList")}
        </Link>

        <header className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_12px_40px_rgba(83,45,58,0.05)]">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-secondary text-lg font-black text-primary">
                {getInitials(candidate.name)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="truncate text-2xl font-black text-foreground sm:text-3xl" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {candidate.name}
                  </h1>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${CANDIDATE_STATUS_CONFIG[c.status].badgeClass}`}>
                    {translateCandidateStatus(c.status, language)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-muted-foreground sm:text-sm">
                  <span className="text-foreground">{c.jobTitle}</span>
                  <span aria-hidden="true">·</span>
                  <span>{t("admin.appliedDate")} {c.appliedAt}</span>
                  <span aria-hidden="true">·</span>
                  <span>{candidate.applications.length} {t("admin.applications")}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <a
                href={`mailto:${c.email}`}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-3.5 text-xs font-bold text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
              >
                <Mail size={15} /> Email
              </a>
              <Link
                to={`/admin/chats?candidate=${c.id}`}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-3.5 text-xs font-bold text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
              >
                <MessageSquare size={15} /> Mở chat
              </Link>
              {hasCv && (
                <a
                  href={c.cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-white transition-colors hover:bg-primary/90"
                >
                  <FileText size={15} /> {t("common.openCv")} <ExternalLink size={13} />
                </a>
              )}
            </div>
          </div>

          {candidate.applications.length > 1 && (
            <div className="border-t border-border bg-[#fffaf7] px-5 py-3 sm:px-6">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                <Briefcase size={12} /> {t("admin.applicationHistory")}
              </div>
              <div className="scrollbar-horizontal flex gap-2 overflow-x-auto">
                {candidate.applications.map(application => (
                  <button
                    key={application.id}
                    type="button"
                    onClick={() => setSearchParams({ application: application.id }, { replace: true })}
                    aria-pressed={application.id === c.id}
                    className={`flex flex-shrink-0 items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all ${
                      application.id === c.id
                        ? "border-primary/30 bg-white text-foreground shadow-sm"
                        : "border-transparent text-muted-foreground hover:border-border hover:bg-white"
                    }`}
                  >
                    <span>
                      <span className="block text-xs font-black">{application.jobTitle}</span>
                      <span className="mt-0.5 block text-[10px] font-semibold">{application.appliedAt}</span>
                    </span>
                    <span className="text-[11px] font-black text-primary">{application.aiScore}%</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
          <main className="min-w-0 space-y-5">
            <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_12px_40px_rgba(83,45,58,0.04)]">
              <div className="flex flex-col gap-4 border-b border-border bg-gradient-to-r from-[#fff9f4] to-white p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2 text-primary">
                    <Sparkles size={16} />
                    <h2 className="text-base font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                      {t("common.aiAnalysis")}
                    </h2>
                  </div>
                  <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{c.aiSummary}</p>
                </div>
                <div className={`flex flex-shrink-0 items-baseline gap-1 rounded-2xl border px-4 py-2.5 ${scoreTone.soft} ${scoreTone.border}`}>
                  <span className={`text-3xl font-black leading-none ${scoreTone.text}`} style={{ fontFamily: "'Playfair Display', serif" }}>
                    {c.aiScore}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">/100</span>
                </div>
              </div>

              <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <AnalysisGroup
                  icon={<CheckCircle size={14} />}
                  title={t("admin.strengths")}
                  items={c.strengths}
                  emptyText="—"
                  tone="text-emerald-700"
                  bulletClass="bg-emerald-500"
                />
                <AnalysisGroup
                  icon={<AlertTriangle size={14} />}
                  title={t("admin.risks")}
                  items={c.risks}
                  emptyText={t("admin.noRisk")}
                  tone="text-amber-700"
                  bulletClass="bg-amber-500"
                />
                <AnalysisGroup
                  icon={<XCircle size={14} />}
                  title={t("admin.missingRequirements")}
                  items={c.missingReqs}
                  emptyText={t("admin.meetsRequirements")}
                  tone="text-red-600"
                  bulletClass="bg-red-500"
                />
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_12px_40px_rgba(83,45,58,0.04)] sm:p-6">
              <div className="flex items-center gap-2">
                <UserRound size={17} className="text-primary" />
                <h2 className="text-base font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {t("admin.personalInfo")}
                </h2>
              </div>

              <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <InfoItem icon={<Mail size={14} />} label={t("common.email")} value={candidate.email || c.email} />
                <InfoItem icon={<Phone size={14} />} label={t("admin.phone")} value={candidate.phone || c.phone || "—"} />
                <InfoItem icon={<MapPin size={14} />} label={t("admin.applicationArea")} value={c.applicationArea || "—"} />
                <InfoItem icon={<Briefcase size={14} />} label={t("admin.appliedRole")} value={c.jobTitle} />
              </dl>

              {c.coverNote && (
                <div className="mt-6 border-l-2 border-primary/40 pl-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">{t("admin.coverNote")}</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{c.coverNote}</p>
                </div>
              )}

              {c.screeningAnswers.length > 0 && (
                <div className="mt-6 border-t border-border pt-6">
                  <h3 className="text-sm font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {t("admin.screeningQuestions")}
                  </h3>
                  <div className="mt-4 divide-y divide-border">
                    {c.screeningAnswers.map((qa, index) => (
                      <div key={`${qa.q}-${index}`} className="py-4 first:pt-0 last:pb-0">
                        <p className="text-xs font-bold leading-5 text-muted-foreground">
                          <span className="mr-1 text-primary">{String(index + 1).padStart(2, "0")}.</span> {qa.q}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-foreground">{qa.a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </main>

          <aside className="min-w-0 space-y-5">
            <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_12px_40px_rgba(83,45,58,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {t("admin.status")} & {t("common.followUp")}
                </h2>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${CANDIDATE_STATUS_CONFIG[c.status].badgeClass}`}>
                  {translateCandidateStatus(c.status, language)}
                </span>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="candidate-status" className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                    {t("admin.status")}
                  </label>
                  <select
                    id="candidate-status"
                    value={c.status}
                    disabled={statusUpdating}
                    onChange={event => void handleStatusChange(event.target.value as CandidateStatus)}
                    className="h-10 w-full rounded-xl border border-border bg-input-background px-3 text-sm font-bold text-foreground outline-none transition-colors focus:border-primary disabled:cursor-wait disabled:opacity-60"
                  >
                    {CANDIDATE_STATUSES.map(status => (
                      <option key={status} value={status}>{translateCandidateStatus(status, language)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="candidate-follow-up" className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                    <Calendar size={12} /> {t("common.followUp")}
                  </label>
                  <input
                    id="candidate-follow-up"
                    type="date"
                    value={followUp}
                    onChange={event => setFollowUp(event.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-input-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                  />
                </div>

                <div>
                  <label htmlFor="candidate-note" className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                    {t("admin.hrNote")}
                  </label>
                  <textarea
                    id="candidate-note"
                    rows={4}
                    value={note}
                    onChange={event => setNote(event.target.value)}
                    placeholder={t("admin.notePlaceholder")}
                    className="w-full resize-none rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm leading-5 text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-bold text-white transition-colors hover:bg-primary/90"
                >
                  {saved ? <Check size={15} /> : <Save size={15} />}
                  {saved ? t("admin.saved") : t("admin.saveNote")}
                </button>
                {error && <p className="text-xs font-semibold text-red-500" role="alert">{error}</p>}
              </div>

              <div className="mt-5 border-t border-border pt-5">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">{t("admin.quickActions")}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/admin/templates"
                    className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 text-center text-xs font-bold text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
                  >
                    <MessageSquare size={14} /> {t("admin.useTemplate")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleCopyEmail()}
                    className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 text-center text-xs font-bold text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? t("common.copied") : t("admin.copyCandidateEmail")}
                  </button>
                </div>
              </div>
            </section>

            <CvPreviewPanel candidate={c} t={t} />
          </aside>
        </div>
      </div>
    </AdminLayout>
  );
}

function AnalysisGroup({
  icon,
  title,
  items,
  emptyText,
  tone,
  bulletClass,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  emptyText: string;
  tone: string;
  bulletClass: string;
}) {
  return (
    <div className="p-5 sm:p-6">
      <p className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${tone}`}>
        {icon} {title}
      </p>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2.5">
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className="flex gap-2.5 text-xs leading-5 text-foreground">
              <span className={`mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full ${bulletClass}`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs font-semibold text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
        {icon} {label}
      </dt>
      <dd className="mt-1.5 break-words text-sm font-bold text-foreground">{value}</dd>
    </div>
  );
}

function CvPreviewPanel({ candidate, t }: { candidate: Candidate; t: (key: TranslationKey) => string }) {
  const hasCv = Boolean(candidate.cvUrl && candidate.cvUrl !== "#");
  const mimeType = candidate.cvFile?.mimeType ?? "";
  const isPdf = mimeType === "application/pdf" || /\.pdf($|[?#])/i.test(candidate.cvUrl);
  const canPreview = hasCv && (isPdf || !candidate.cvFile);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_12px_40px_rgba(83,45,58,0.04)]">
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            <h2 className="text-base font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              {t("admin.cvPreview")}
            </h2>
          </div>
          <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">
            {candidate.cvFile?.originalName ?? "CV / Portfolio"}
          </p>
        </div>
        {hasCv && (
          <a
            href={candidate.cvUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("common.openCv")}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-border text-primary transition-colors hover:border-primary/40 hover:bg-secondary"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      {candidate.cvFile && (
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-y border-border bg-[#fffaf7] px-5 py-3">
          <FileMeta label={t("admin.fileType")} value={formatFileType(mimeType)} />
          <FileMeta label={t("admin.fileSize")} value={formatFileSize(candidate.cvFile.sizeBytes)} />
        </div>
      )}

      {canPreview ? (
        <div className="h-[680px] bg-[#f5eee9]">
          <iframe title={`${candidate.name} CV`} src={candidate.cvUrl} className="h-full w-full bg-white" />
        </div>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center border-t border-border bg-[#fffaf7] px-8 py-10 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
            <FileText size={22} />
          </div>
          <p className="text-sm font-black text-foreground">{t("admin.cvPreviewUnavailable")}</p>
          <p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">{t("admin.cvPreviewHint")}</p>
          {hasCv && (
            <a
              href={candidate.cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex h-9 items-center gap-2 rounded-xl bg-white px-4 text-xs font-bold text-primary shadow-sm ring-1 ring-border transition-all hover:ring-primary/30"
            >
              {t("common.openCv")} <ExternalLink size={13} />
            </a>
          )}
        </div>
      )}
    </section>
  );
}

function FileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
      <span className="ml-2 text-[11px] font-bold text-foreground">{value}</span>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map(part => part.charAt(0))
    .join("")
    .toUpperCase();
}

function formatFileType(mimeType: string) {
  if (!mimeType) return "—";
  return mimeType.split("/").pop()?.toUpperCase() ?? mimeType;
}

function formatFileSize(sizeBytes: number) {
  if (!sizeBytes) return "—";
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
