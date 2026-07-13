import { useId, useRef, useState } from "react";
import { Briefcase, FileText, MapPin, Send, Upload, X } from "lucide-react";
import { Link } from "react-router";
import type { Job } from "@/app/data";
import { useData } from "@/app/data";
import { translateJobType, useLanguage } from "@/app/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";

const MAX_CV_FILE_SIZE_MB = Number(
  import.meta.env.VITE_MAX_CV_FILE_SIZE_MB ?? 10,
);
const MAX_CV_FILE_SIZE_BYTES = MAX_CV_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_CV_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ALLOWED_CV_EXTENSIONS = new Set(["pdf", "doc", "docx"]);

type ApplicationFormProps = {
  job: Job;
  onSuccess: () => void;
  variant?: "page" | "dialog";
};

type TextFieldName = "name" | "email" | "phone" | "applicationArea" | "cvUrl" | "note";

const APPLICATION_AREAS = [
  { value: "Hà Nội", labelKey: "apply.areaHaNoi" },
  { value: "Đà Nẵng", labelKey: "apply.areaDaNang" },
  { value: "Hải Phòng", labelKey: "apply.areaHaiPhong" },
  { value: "Quảng Ninh", labelKey: "apply.areaQuangNinh" },
  { value: "TP Hồ Chí Minh", labelKey: "apply.areaTpHcm" },
  { value: "Remote", labelKey: "apply.areaRemote" },
] as const;

const fieldControlClassName =
  "min-h-[42px] w-full rounded-xl border bg-input-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
}) {
  const required = label.trim().endsWith("*");
  const visibleLabel = required ? label.trim().slice(0, -1).trimEnd() : label;

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-foreground"
      >
        {visibleLabel}
        {required && <span className="ml-0.5 text-primary">*</span>}
      </label>
      {children}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-xs font-semibold text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function ApplicationJobSummary({ job }: { job: Job }) {
  const { language } = useLanguage();

  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/15 bg-white p-3 shadow-sm">
      <div className="flex size-11 flex-none items-center justify-center rounded-xl border border-primary/15 bg-pink-50 text-xl">
        {job.logo}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-extrabold text-foreground">
          {job.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-4 text-muted-foreground">
          <span className="font-semibold text-foreground/70">{job.company}</span>
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {job.location}
          </span>
          <span className="flex items-center gap-1">
            <Briefcase size={11} />
            {translateJobType(job.type, language)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ApplicationForm({
  job,
  onSuccess,
  variant = "page",
}: ApplicationFormProps) {
  const { addCandidate } = useData();
  const { t } = useLanguage();
  const idPrefix = useId();
  const fieldId = (name: string) => `${idPrefix}-${name}`;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    applicationArea: "",
    cvUrl: "",
    note: "",
    agreed: false,
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validateCvFile(file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (
      !ALLOWED_CV_EXTENSIONS.has(extension) ||
      (file.type !== "" && !ALLOWED_CV_MIME_TYPES.has(file.type))
    ) {
      return t("apply.cvTypeError");
    }

    if (file.size > MAX_CV_FILE_SIZE_BYTES) {
      return t("apply.cvSizeError");
    }

    return "";
  }

  function isValidPublicUrl(value: string) {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = t("apply.nameRequired");
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))
      nextErrors.email = t("apply.emailInvalid");
    const normalizedPhone = form.phone.replace(/[\s().-]/g, "");
    if (!form.phone.trim()) nextErrors.phone = t("apply.phoneRequired");
    else if (!/^\+?\d{8,15}$/.test(normalizedPhone))
      nextErrors.phone = t("apply.phoneInvalid");
    if (!form.applicationArea) nextErrors.applicationArea = t("apply.areaRequired");
    if (!form.cvUrl.trim() && !cvFile) nextErrors.cv = t("apply.cvRequired");
    if (form.cvUrl.trim() && !isValidPublicUrl(form.cvUrl.trim()))
      nextErrors.cv = t("apply.cvUrlInvalid");
    if (cvFile) {
      const fileError = validateCvFile(cvFile);
      if (fileError) nextErrors.cv = fileError;
    }
    if (!form.agreed) nextErrors.agreed = t("apply.agreeError");
    return nextErrors;
  }

  function clearErrors(...names: string[]) {
    setErrors((previous) => {
      const next = { ...previous };
      names.forEach((name) => delete next[name]);
      delete next.submit;
      return next;
    });
  }

  function updateTextField(name: TextFieldName, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    clearErrors(name === "cvUrl" ? "cv" : name);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const formElement = event.currentTarget;
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      window.requestAnimationFrame(() => {
        const firstInvalidField = formElement.querySelector<HTMLElement>(
          "[aria-invalid='true']",
        );
        firstInvalidField?.focus({ preventScroll: true });
        firstInvalidField?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      await addCandidate({
        name: form.name,
        email: form.email,
        phone: form.phone,
        applicationArea: form.applicationArea,
        cvUrl: form.cvUrl.trim(),
        cvFile,
        note: form.note,
        jobId: job.id,
        jobTitle: job.title,
        status: "new",
      });
      onSuccess();
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : t("apply.submitError"),
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleCvFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setCvFile(null);
    clearErrors("cv");

    if (!file) return;

    const error = validateCvFile(file);
    if (error) {
      setErrors((previous) => ({ ...previous, cv: error }));
      event.target.value = "";
      return;
    }

    setCvFile(file);
  }

  function removeCvFile() {
    setCvFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    clearErrors("cv");
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  const submitButton = (
    <button
      type="submit"
      disabled={submitting}
      className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-primary px-5 py-3 text-sm font-bold text-white shadow-sm transition-[background-color,box-shadow,transform] hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:shadow-sm"
    >
      <Send size={16} /> {submitting ? t("common.loading") : t("apply.submit")}
    </button>
  );

  const formFields = (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("apply.nameLabel")}
          id={fieldId("name")}
          error={errors.name}
        >
          <input
            id={fieldId("name")}
            required
            value={form.name}
            onChange={(event) => updateTextField("name", event.target.value)}
            placeholder={t("apply.namePlaceholder")}
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={
              errors.name ? `${fieldId("name")}-error` : undefined
            }
            className={`${fieldControlClassName} ${errors.name ? "border-red-300 focus:border-red-500" : "border-border"}`}
          />
        </Field>
        <Field
          label={t("apply.emailLabel")}
          id={fieldId("email")}
          error={errors.email}
        >
          <input
            id={fieldId("email")}
            type="email"
            required
            value={form.email}
            onChange={(event) => updateTextField("email", event.target.value)}
            placeholder="lan@email.com"
            autoComplete="email"
            inputMode="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={
              errors.email ? `${fieldId("email")}-error` : undefined
            }
            className={`${fieldControlClassName} ${errors.email ? "border-red-300 focus:border-red-500" : "border-border"}`}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("apply.phoneLabel")}
          id={fieldId("phone")}
          error={errors.phone}
        >
          <input
            id={fieldId("phone")}
            type="tel"
            required
            value={form.phone}
            onChange={(event) => updateTextField("phone", event.target.value)}
            placeholder="0912 345 678"
            autoComplete="tel"
            inputMode="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? `${fieldId("phone")}-error` : undefined}
            className={`${fieldControlClassName} ${errors.phone ? "border-red-300 focus:border-red-500" : "border-border"}`}
          />
        </Field>

        <Field
          label={t("apply.areaLabel")}
          id={fieldId("application-area")}
          error={errors.applicationArea}
        >
          <Select
            value={form.applicationArea}
            onValueChange={(value) => updateTextField("applicationArea", value)}
          >
            <SelectTrigger
              id={fieldId("application-area")}
              aria-invalid={Boolean(errors.applicationArea)}
              aria-describedby={errors.applicationArea ? `${fieldId("application-area")}-error` : undefined}
              className={`h-[42px] cursor-pointer rounded-xl bg-input-background px-3 text-sm font-semibold focus-visible:ring-0 data-[size=default]:h-[42px] ${errors.applicationArea ? "border-red-300 focus-visible:border-red-500" : "border-border focus-visible:border-primary"}`}
            >
              <SelectValue placeholder={t("apply.areaSelect")} />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border bg-white p-1 shadow-lg">
              {APPLICATION_AREAS.map((area) => (
                <SelectItem key={area.value} value={area.value} className="cursor-pointer rounded-lg font-semibold">
                  {t(area.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field
        label={t("apply.cvLabel")}
        id={fieldId("cv-url")}
        error={errors.cv}
      >
        <div className="relative">
          <Upload
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id={fieldId("cv-url")}
            type="url"
            value={form.cvUrl}
            onChange={(event) => updateTextField("cvUrl", event.target.value)}
            placeholder={t("apply.cvPlaceholder")}
            autoComplete="url"
            inputMode="url"
            aria-invalid={Boolean(errors.cv)}
            aria-describedby={`${fieldId("cv-url")}-help${errors.cv ? ` ${fieldId("cv-url")}-error` : ""}`}
            className={`${fieldControlClassName} pl-9 pr-3 ${errors.cv ? "border-red-300 focus:border-red-500" : "border-border"}`}
          />
        </div>

        <div className="my-2.5 flex items-center gap-3" aria-hidden="true">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/75">
            {t("apply.orUploadFile")}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <input
          ref={fileInputRef}
          id={fieldId("cv-file")}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onClick={(event) => {
            event.currentTarget.value = "";
          }}
          onChange={handleCvFileChange}
          className="peer sr-only"
        />
        <label
          htmlFor={fieldId("cv-file")}
          className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm font-bold transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-primary/20 ${errors.cv ? "border-red-300 bg-red-50/50 text-red-700" : "border-border bg-input-background text-primary hover:border-primary hover:bg-pink-50"}`}
        >
          <FileText size={17} />
          {cvFile ? t("apply.replaceFile") : t("apply.uploadFile")}
        </label>

        {cvFile && (
          <div className="mt-2.5 flex items-center justify-between gap-3 rounded-xl border border-primary/15 bg-pink-50/60 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-foreground">
                {cvFile.name}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {formatFileSize(cvFile.size)} ·{" "}
                {cvFile.type || cvFile.name.split(".").pop()?.toUpperCase()}
              </p>
            </div>
            <button
              type="button"
              onClick={removeCvFile}
              className="flex size-8 flex-none cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-red-100 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              aria-label={t("apply.removeFile")}
            >
              <X size={14} />
            </button>
          </div>
        )}
        <p
          id={`${fieldId("cv-url")}-help`}
          className="mt-1.5 text-[11px] leading-4 text-muted-foreground"
        >
          {t("apply.cvHelp")}
        </p>
      </Field>

      <Field label={t("apply.noteLabel")} id={fieldId("note")}>
        <textarea
          id={fieldId("note")}
          rows={3}
          value={form.note}
          onChange={(event) => updateTextField("note", event.target.value)}
          placeholder={t("apply.notePlaceholder")}
          className={`${fieldControlClassName} min-h-[106px] resize-y border-border leading-5`}
        />
      </Field>

      <div
        className={`rounded-xl border p-3.5 transition-colors ${errors.agreed ? "border-red-300 bg-red-50/60" : "border-primary/15 bg-primary/[0.025] hover:border-primary/30"}`}
      >
        <div className="flex items-start gap-3">
          <input
            id={fieldId("agreed")}
            type="checkbox"
            required
            checked={form.agreed}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                agreed: event.target.checked,
              }));
              clearErrors("agreed");
            }}
            aria-invalid={Boolean(errors.agreed)}
            aria-describedby={
              errors.agreed ? `${fieldId("agreed")}-error` : undefined
            }
            className="mt-0.5 size-4 flex-none cursor-pointer accent-pink-600 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20"
          />
          <div className="min-w-0">
            <label
              htmlFor={fieldId("agreed")}
              className="block cursor-pointer text-xs font-normal leading-5 text-muted-foreground"
            >
              {t("apply.agreeText")}
            </label>
            <Link
              to="/privacy"
              className="mt-1 inline-flex text-xs font-bold text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              {t("apply.privacyPolicy")}
            </Link>
          </div>
        </div>
        {errors.agreed && (
          <p
            id={`${fieldId("agreed")}-error`}
            role="alert"
            className="ml-7 mt-2 text-xs font-semibold text-red-600"
          >
            {errors.agreed}
          </p>
        )}
      </div>

      {variant === "page" && (
        <div>
          {errors.submit && (
            <p role="alert" className="mb-2 text-xs font-semibold text-red-600">
              {errors.submit}
            </p>
          )}
          {submitButton}
        </div>
      )}
    </>
  );

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={submitting}
      className={
        variant === "dialog" ? "flex min-h-0 flex-1 flex-col" : undefined
      }
    >
      <div
        className={
          variant === "dialog"
            ? "scrollbar-dialog min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-white px-5 py-5 sm:px-6"
            : "space-y-5"
        }
      >
        {formFields}
      </div>
      {variant === "dialog" && (
        <div className="flex-none border-t border-border bg-white px-5 py-3 shadow-[0_-8px_24px_rgba(74,37,50,0.05)] sm:px-6 sm:py-4">
          {errors.submit && (
            <p role="alert" className="mb-2 text-xs font-semibold text-red-600">
              {errors.submit}
            </p>
          )}
          {submitButton}
        </div>
      )}
    </form>
  );
}
