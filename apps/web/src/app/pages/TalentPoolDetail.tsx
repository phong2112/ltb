import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  BriefcaseBusiness,
  ExternalLink,
  Mail,
  NotebookPen,
  Phone,
  Save,
  Tag,
  Trash2,
  UserRound,
} from "lucide-react";
import { CvDocumentPreview } from "@/app/components/CandidateDetailSections";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import type { ApiJob } from "@/app/data-types";
import { useLanguage } from "@/app/i18n";
import AdminLayout from "@/app/layouts/AdminLayout";
import { API_BASE, apiRequest } from "@/app/services/api-client";
import { notificationService } from "@/app/services/notification";
import {
  deleteTalentPoolEntry,
  getTalentPoolEntry,
  promoteTalentPoolEntry,
  type TalentPoolEntry,
  updateTalentPoolEntry,
} from "@/app/services/talent-pool-api";
import { StatusBadge } from "@/app/pages/TalentPool";

type ProfileForm = {
  fullName: string;
  email: string;
  phone: string;
  title: string;
  skills: string;
  notes: string;
};

const EMPTY_FORM: ProfileForm = { fullName: "", email: "", phone: "", title: "", skills: "", notes: "" };

export default function TalentPoolDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [entry, setEntry] = useState<TalentPoolEntry | null>(null);
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [promoteJobId, setPromoteJobId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setIsLoading(true);
    Promise.all([getTalentPoolEntry(id), apiRequest<ApiJob[]>("/admin/jobs")])
      .then(([loadedEntry, loadedJobs]) => {
        if (cancelled) return;
        setEntry(loadedEntry);
        setForm(formFromEntry(loadedEntry));
        setJobs(loadedJobs);
        setError("");
      })
      .catch(loadError => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : t("talentPool.detailLoadError"));
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [id, t]);

  useEffect(() => {
    if (!id || !entry || (entry.status !== "PENDING" && entry.status !== "EXTRACTING")) return;
    const timer = window.setInterval(() => {
      void getTalentPoolEntry(id).then(updated => {
        setEntry(updated);
        if (!isDirty) setForm(formFromEntry(updated));
      }).catch(() => undefined);
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [entry, id, isDirty]);

  function updateField(field: keyof ProfileForm, value: string) {
    setForm(current => ({ ...current, [field]: value }));
    setIsDirty(true);
  }

  async function handleSave() {
    if (!id || !entry) return;
    setIsSaving(true);
    const toastId = notificationService.loading(t("talentPool.saving"));
    try {
      const updated = await updateTalentPoolEntry(id, {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        title: form.title.trim(),
        skills: splitValues(form.skills),
        notes: form.notes.trim(),
      });
      setEntry(updated);
      setForm(formFromEntry(updated));
      setIsDirty(false);
      notificationService.success(t("talentPool.saved"), toastId);
    } catch (saveError) {
      notificationService.error(saveError, t("talentPool.saveError"), toastId);
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePromote() {
    if (!id || !entry || !promoteJobId) return;
    setIsPromoting(true);
    const toastId = notificationService.loading(t("talentPool.promoting"));
    try {
      const result = await promoteTalentPoolEntry(id, promoteJobId);
      setEntry(current => current ? { ...current, promotedApplicationId: result.applicationId } : current);
      notificationService.success(t("talentPool.promoted"), toastId);
    } catch (promoteError) {
      notificationService.error(promoteError, t("talentPool.promoteError"), toastId);
    } finally {
      setIsPromoting(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    setIsDeleting(true);
    try {
      await deleteTalentPoolEntry(id);
      notificationService.success(t("talentPool.deleted"));
      navigate("/admin/talent-pool", { replace: true });
    } catch (deleteError) {
      notificationService.error(deleteError, t("talentPool.deleteError"));
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return <AdminLayout><div className="py-32 text-center text-sm font-semibold text-muted-foreground">{t("common.loading")}</div></AdminLayout>;
  }

  if (!entry) {
    return (
      <AdminLayout>
        <div className="py-32 text-center"><p className="text-lg font-bold text-foreground">{error || t("talentPool.notFound")}</p><Link to="/admin/talent-pool" className="mt-3 inline-block text-sm font-bold text-primary underline">{t("common.backToList")}</Link></div>
      </AdminLayout>
    );
  }

  const promotedJob = jobs.find(job => job.id === promoteJobId);
  const cvUrl = entry.file ? `${API_BASE}/admin/candidates/files/${entry.file.id}` : "#";
  const displayName = resolvedFullName(entry);

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1500px] space-y-4">
        <header className="flex flex-col gap-4 rounded-xl border border-border bg-white p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <Link to="/admin/talent-pool" className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-primary"><ArrowLeft size={13} /> {t("common.backToList")}</Link>
            <div className="flex flex-wrap items-center gap-3"><h1 className="max-w-full truncate text-xl font-black text-foreground sm:text-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>{displayName}</h1><StatusBadge status={entry.status} language={language} /></div>
            <p className="mt-1 text-xs text-muted-foreground">{entry.file?.originalName ?? "CV"} · {formatDate(entry.createdAt, language)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void handleSave()} disabled={!isDirty || isSaving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-white disabled:opacity-50"><Save size={14} /> {isSaving ? t("talentPool.saving") : t("talentPool.save")}</button>
            <DeleteDialog name={displayName} isDeleting={isDeleting} onConfirm={() => void handleDelete()} t={t} />
          </div>
        </header>

        {entry.errorMessage && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{entry.summary || entry.errorMessage}</div>}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(480px,580px)]">
          <main className="space-y-5">
            <section className="rounded-xl border border-border bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2"><UserRound size={16} className="text-primary" /><h2 className="text-base font-black text-foreground">{t("admin.personalInfo")}</h2></div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t("admin.fullName")} icon={<UserRound size={14} />}><input value={form.fullName} onChange={event => updateField("fullName", event.target.value)} className={inputClass} /></Field>
                <Field label={t("talentPool.titleLabel")} icon={<BriefcaseBusiness size={14} />}><input value={form.title} onChange={event => updateField("title", event.target.value)} className={inputClass} /></Field>
                <Field label={t("common.email")} icon={<Mail size={14} />}><input type="email" value={form.email} onChange={event => updateField("email", event.target.value)} className={inputClass} /></Field>
                <Field label={t("admin.phone")} icon={<Phone size={14} />}><input value={form.phone} onChange={event => updateField("phone", event.target.value)} className={inputClass} /></Field>
                <Field label={t("talentPool.skills")} icon={<Tag size={14} />} wide><input value={form.skills} onChange={event => updateField("skills", event.target.value)} placeholder={t("talentPool.commaSeparated")} className={inputClass} /></Field>
                <Field label={t("admin.hrNote")} icon={<NotebookPen size={14} />} wide><textarea rows={4} value={form.notes} onChange={event => updateField("notes", event.target.value)} className={`${inputClass} h-auto resize-y`} /></Field>
              </div>
              {(entry.structuredData?.linkedinUrl || entry.structuredData?.portfolioUrl) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {linkField(entry.structuredData.linkedinUrl) && <ExternalProfileLink href={linkField(entry.structuredData.linkedinUrl)} label="LinkedIn" />}
                  {linkField(entry.structuredData.portfolioUrl) && <ExternalProfileLink href={linkField(entry.structuredData.portfolioUrl)} label="Portfolio" />}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-border bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2"><BriefcaseBusiness size={16} className="text-primary" /><h2 className="text-base font-black text-foreground">{t("talentPool.assignJob")}</h2></div>
              {entry.promotedApplicationId ? (
                <div className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-bold text-emerald-800">{t("talentPool.alreadyAssigned")}</p><Link to={`/admin/candidates/${entry.candidate.id}?application=${entry.promotedApplicationId}`} className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 underline">{t("talentPool.openApplication")} <ExternalLink size={13} /></Link></div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <select value={promoteJobId} onChange={event => setPromoteJobId(event.target.value)} className="h-10 min-w-0 rounded-lg border border-border bg-input-background px-3 text-sm outline-none focus:border-primary"><option value="">{t("talentPool.chooseJob")}</option>{jobs.filter(job => job.status !== "ARCHIVED").map(job => <option key={job.id} value={job.id}>{job.title}</option>)}</select>
                  <button type="button" disabled={!promoteJobId || isPromoting} onClick={() => void handlePromote()} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-xs font-bold text-white disabled:opacity-50"><BriefcaseBusiness size={14} /> {isPromoting ? t("talentPool.promoting") : t("talentPool.assign")}</button>
                  {promotedJob && <p className="text-xs text-muted-foreground sm:col-span-2">{t("talentPool.assignHint")} <strong>{promotedJob.title}</strong>.</p>}
                </div>
              )}
            </section>
          </main>

          <CvDocumentPreview name={displayName} cvUrl={cvUrl} cvFile={entry.file} t={t} />
        </div>
      </div>
    </AdminLayout>
  );
}

const inputClass = "h-10 w-full rounded-lg border border-border bg-input-background px-3 text-sm text-foreground outline-none focus:border-primary";

function Field({ label, icon, wide, children }: { label: string; icon: React.ReactNode; wide?: boolean; children: React.ReactNode }) {
  return <label className={wide ? "md:col-span-2" : ""}><span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-foreground">{icon}{label}</span>{children}</label>;
}

function DeleteDialog({ name, isDeleting, onConfirm, t }: { name: string; isDeleting: boolean; onConfirm: () => void; t: ReturnType<typeof useLanguage>["t"] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-bold text-red-700 hover:bg-red-50"><Trash2 size={14} /> {t("talentPool.delete")}</button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t("talentPool.deleteTitle")}</AlertDialogTitle><AlertDialogDescription>{t("talentPool.deleteDescription")} <strong>{name}</strong>.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t("admin.cancel")}</AlertDialogCancel><AlertDialogAction disabled={isDeleting} onClick={onConfirm} className="bg-red-600 text-white hover:bg-red-700">{isDeleting ? t("talentPool.deleting") : t("talentPool.delete")}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ExternalProfileLink({ href, label }: { href: string; label: string }) { return <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold text-primary hover:bg-pink-50">{label}<ExternalLink size={12} /></a>; }
function formFromEntry(entry: TalentPoolEntry): ProfileForm { const data = entry.structuredData ?? {}; return { fullName: resolvedFullName(entry), email: text(data.email) || entry.candidate.email || "", phone: text(data.phone) || entry.candidate.phone || "", title: text(data.title), skills: stringList(data.skills).join(", "), notes: entry.notes ?? "" }; }
function splitValues(value: string) { return [...new Set(value.split(",").map(item => item.trim()).filter(Boolean))]; }
function text(value: unknown) { return typeof value === "string" ? value : ""; }
function stringList(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function linkField(value: unknown) { return typeof value === "string" && /^https?:\/\//i.test(value) ? value : ""; }
function resolvedFullName(entry: TalentPoolEntry) {
  const extractedName = text(entry.structuredData?.fullName).trim();
  const currentName = entry.candidate.fullName?.trim() ?? "";
  return extractedName && shouldPreferExtractedName(currentName, entry.file?.originalName) ? extractedName : currentName;
}
function shouldPreferExtractedName(currentName: string, originalName?: string) {
  const lower = currentName.toLowerCase();
  if (!currentName || lower === "ứng viên đang xử lý") return true;
  if (/\.(pdf|docx?|rtf|txt)$/i.test(currentName)) return true;
  if (/\d{6,}/.test(currentName) && /[-_]/.test(currentName)) return true;
  if (/(^|[-_])inbound\d/i.test(currentName)) return true;
  if (currentName.includes("_")) return true;
  const fileBaseName = originalName ? originalName.replace(/\.[^.]+$/, "").trim().toLowerCase() : "";
  return !!fileBaseName && lower === fileBaseName;
}
function formatDate(value: string, language: "vi" | "en") { return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-US", { dateStyle: "medium" }).format(new Date(value)); }
