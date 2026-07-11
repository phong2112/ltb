import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { ChevronLeft, Upload, Send, Briefcase, MapPin, FileText, X } from "lucide-react";
import { useData } from "@/app/data";
import { translateJobType, useLanguage } from "@/app/i18n";
import PublicLayout from "@/app/layouts/PublicLayout";

const MAX_CV_FILE_SIZE_MB = Number(import.meta.env.VITE_MAX_CV_FILE_SIZE_MB ?? 10);
const MAX_CV_FILE_SIZE_BYTES = MAX_CV_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_CV_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ALLOWED_CV_EXTENSIONS = new Set(["pdf", "doc", "docx"]);

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export default function Apply() {
  const { id } = useParams();
  const { jobs, isLoading, addCandidate } = useData();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const selectedJob = jobs.find(j => j.id === id && j.status === "published");

  const [form, setForm] = useState({ name: "", email: "", phone: "", cvUrl: "", note: "", agreed: false });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (!selectedJob && isLoading) return (
    <PublicLayout>
      <div className="text-center py-32 text-sm font-semibold text-muted-foreground">Đang tải vị trí...</div>
    </PublicLayout>
  );

  if (!selectedJob) return (
    <PublicLayout>
      <div className="text-center py-32">
        <div className="text-5xl mb-4">🌸</div>
        <p className="text-xl font-bold mb-2">{t("apply.notFound")}</p>
        <Link to="/jobs" className="text-primary underline text-sm">{t("common.backToList")}</Link>
      </div>
    </PublicLayout>
  );

  const job = selectedJob;

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = t("apply.nameRequired");
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = t("apply.emailInvalid");
    if (!form.cvUrl.trim() && !cvFile) e.cv = t("apply.cvRequired");
    if (cvFile) {
      const fileError = validateCvFile(cvFile);
      if (fileError) e.cv = fileError;
    }
    if (!form.agreed) e.agreed = t("apply.agreeError");
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setErrors({});

    try {
      await addCandidate({ name: form.name, email: form.email, phone: form.phone, cvUrl: form.cvUrl.trim(), cvFile, note: form.note, jobId: job.id, jobTitle: job.title, status: "new" });
      navigate("/apply/success");
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : "Không gửi được đơn ứng tuyển" });
    } finally {
      setSubmitting(false);
    }
  }

  function validateCvFile(file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_CV_EXTENSIONS.has(extension) || !ALLOWED_CV_MIME_TYPES.has(file.type)) {
      return t("apply.cvTypeError");
    }

    if (file.size > MAX_CV_FILE_SIZE_BYTES) {
      return t("apply.cvSizeError");
    }

    return "";
  }

  function handleCvFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setCvFile(null);
    setErrors(prev => {
      const next = { ...prev };
      delete next.cv;
      delete next.cvUrl;
      return next;
    });

    if (!file) return;

    const error = validateCvFile(file);
    if (error) {
      setErrors(prev => ({ ...prev, cv: error }));
      e.target.value = "";
      return;
    }

    setCvFile(file);
  }

  function removeCvFile() {
    setCvFile(null);
    setErrors(prev => {
      const next = { ...prev };
      delete next.cv;
      return next;
    });
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link to={`/jobs/${job.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
          <ChevronLeft size={15} /> {t("apply.backToJd")}
        </Link>

        {/* Job summary */}
        <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4 flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-white border border-pink-100 flex items-center justify-center text-2xl flex-shrink-0">{job.logo}</div>
          <div>
            <p className="font-black text-foreground text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>{job.title}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span>{job.company}</span>
              <span className="flex items-center gap-0.5"><MapPin size={10} />{job.location}</span>
              <span className="flex items-center gap-0.5"><Briefcase size={10} />{translateJobType(job.type, language)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6">
          <h1 className="text-xl font-black text-foreground mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>{t("apply.formTitle")}</h1>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t("apply.nameLabel")} id="name" error={errors.name}>
                <input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t("apply.namePlaceholder")} className={`w-full px-3 py-2.5 bg-input-background border rounded-xl text-sm outline-none focus:border-primary transition-colors ${errors.name ? "border-red-300" : "border-border"}`} />
              </Field>
              <Field label={t("apply.emailLabel")} id="email" error={errors.email}>
                <input id="email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="lan@email.com" className={`w-full px-3 py-2.5 bg-input-background border rounded-xl text-sm outline-none focus:border-primary transition-colors ${errors.email ? "border-red-300" : "border-border"}`} />
              </Field>
            </div>

            <Field label={t("apply.phoneLabel")} id="phone">
              <input id="phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0912 345 678" className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm outline-none focus:border-primary transition-colors" />
            </Field>

            <Field label={t("apply.cvLabel")} id="cvUrl" error={errors.cv}>
              <div className={`rounded-2xl border p-3 ${errors.cv ? "border-red-300 bg-red-50/40" : "border-border bg-white"}`}>
                <div className="relative">
                  <Upload size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="cvUrl"
                    value={form.cvUrl}
                    onChange={e => {
                      setForm(f => ({ ...f, cvUrl: e.target.value }));
                      setErrors(prev => {
                        const next = { ...prev };
                        delete next.cv;
                        return next;
                      });
                    }}
                    placeholder={t("apply.cvPlaceholder")}
                    className="w-full pl-8 pr-3 py-2.5 bg-input-background border border-border rounded-xl text-sm outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="my-3 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{t("apply.orUploadFile")}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <label htmlFor="cvFile" className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-pink-200 bg-pink-50/60 px-4 py-4 text-sm font-bold text-primary transition-colors hover:border-primary hover:bg-pink-50">
                  <FileText size={17} />
                  {cvFile ? t("apply.replaceFile") : t("apply.uploadFile")}
                </label>
                <input id="cvFile" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleCvFileChange} className="sr-only" />

                {cvFile && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-pink-100 bg-white px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-foreground">{cvFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatFileSize(cvFile.size)} · {cvFile.type}</p>
                    </div>
                    <button type="button" onClick={removeCvFile} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-pink-50 hover:text-primary" aria-label={t("apply.removeFile")}>
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{t("apply.cvHelp")}</p>
            </Field>

            <Field label={t("apply.noteLabel")} id="note">
              <textarea id="note" rows={4} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder={t("apply.notePlaceholder")} className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm outline-none focus:border-primary transition-colors resize-none" />
            </Field>

            <div className={`p-4 rounded-xl border ${errors.agreed ? "border-red-200 bg-red-50" : "border-border bg-muted/30"}`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={form.agreed} onChange={e => setForm(f => ({ ...f, agreed: e.target.checked }))} className="mt-0.5 w-4 h-4 accent-pink-500 flex-shrink-0" />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {t("apply.agreeText")}
                </span>
              </label>
              {errors.agreed && <p className="text-xs text-red-500 mt-2 ml-7">{errors.agreed}</p>}
            </div>

            {errors.submit && <p className="text-xs text-red-500">{errors.submit}</p>}

            <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-sm disabled:cursor-not-allowed disabled:opacity-70">
              <Send size={15} /> {submitting ? "Đang gửi..." : t("apply.submit")}
            </button>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
}
