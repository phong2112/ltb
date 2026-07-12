import { useState, useEffect, type ReactNode } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { ChevronLeft, Globe, FileText, X } from "lucide-react";
import { useData, Job } from "@/app/data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { translateJobLevel, translateJobType, useLanguage } from "@/app/i18n";
import AdminLayout from "@/app/layouts/AdminLayout";

const EMPTY: Omit<Job, "id" | "posted" | "applicants"> = {
  title: "", company: "", location: "", type: "Full-time", level: "Mid-level",
  salary: "", tags: [], description: "", requirements: "", benefits: "",
  status: "draft", urgent: false, logo: "🌷",
};

const LOGOS = ["🌸", "🌹", "🌷", "🍑", "💻", "📊", "🎨", "🌿", "⭐", "🦋"];
const SALARY_CURRENCIES = ["VND", "USD"] as const;
const JOB_TYPES = ["Full-time", "Hybrid", "Remote", "Part-time"] as const;
const JOB_LEVELS = ["Intern", "Junior", "Mid-level", "Senior", "Manager", "Director"] as const;
const TEXT_PATTERN = /^[\p{L}\p{N}\s.,'’()&/+:#-]+$/u;
const LOCATION_PATTERN = /^[\p{L}\p{N}\s.,/()&+-]+$/u;
const TAG_PATTERN = /^[\p{L}\p{N}\s+#./-]+$/u;
const MAX = {
  title: 120,
  company: 100,
  location: 120,
  salary: 40,
  tags: 240,
  description: 5000,
  requirements: 4000,
  benefits: 3000,
};

type SalaryCurrency = typeof SALARY_CURRENCIES[number];
type JobType = typeof JOB_TYPES[number];
type JobLevel = typeof JOB_LEVELS[number];
type JobFormField = "title" | "company" | "location" | "salary" | "type" | "level" | "tags" | "description" | "requirements" | "benefits";
type FormErrors = Partial<Record<JobFormField, string>>;

function FormField({ label, children, error, hint, span2 }: { label: string; children: ReactNode; error?: string; hint?: string; span2?: boolean }) {
  return (
    <div className={span2 ? "sm:col-span-2" : ""}>
      <label className="text-xs font-bold text-foreground mb-1.5 block uppercase tracking-wide">{label}</label>
      {children}
      <div className="mt-1 min-h-4 text-[11px] leading-4">
        {error ? <span className="font-semibold text-red-600">{error}</span> : hint ? <span className="text-muted-foreground">{hint}</span> : null}
      </div>
    </div>
  );
}

function parseSalary(value: string): { amount: string; currency: SalaryCurrency } {
  const trimmed = value.trim();
  const currencyMatch = trimmed.match(/\b(VND|USD)\s*$/i);
  const currency = currencyMatch ? currencyMatch[1].toUpperCase() as SalaryCurrency : "VND";
  const amount = currencyMatch ? trimmed.slice(0, currencyMatch.index).trim() : trimmed;

  return {
    amount: formatSalaryAmount(amount),
    currency,
  };
}

function buildSalary(amount: string, currency: SalaryCurrency) {
  return amount.trim() ? `${amount.trim()} ${currency}` : "";
}

function formatSalaryAmount(value: string) {
  const normalized = value.replace(/[–—]/g, "-");

  if (normalized.includes("-")) {
    const [min = "", max = ""] = normalized.split("-", 2);
    const formattedMin = formatNumberString(min);
    const formattedMax = formatNumberString(max);
    return formattedMax ? `${formattedMin} - ${formattedMax}` : `${formattedMin} - `;
  }

  return formatNumberString(normalized);
}

function formatNumberString(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function cleanTagList(values: string[]) {
  const seen = new Set<string>();
  const tags: string[] = [];

  values.forEach(value => {
    const tag = value.trim();
    const key = tag.toLowerCase();

    if (tag && !seen.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
  });

  return tags;
}

function parseSalaryNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

function validateSalary(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length > MAX.salary) return `Lương tối đa ${MAX.salary} ký tự`;

  const [range] = trimmed.split(/\s+(VND|USD)$/i);
  const parts = range.split("-").map(part => part.trim()).filter(Boolean);

  if (!/^\d{1,3}(,\d{3})*(\s*-\s*\d{1,3}(,\d{3})*)?\s+(VND|USD)$/i.test(trimmed)) {
    return "Lương chỉ nhập số hoặc khoảng số, ví dụ 20,000,000 - 30,000,000 VND";
  }

  if (parts.length === 2 && parseSalaryNumber(parts[0]) >= parseSalaryNumber(parts[1])) {
    return "Mức lương tối thiểu phải nhỏ hơn mức tối đa";
  }

  return "";
}

function validateJobForm(job: Omit<Job, "id" | "posted" | "applicants">, tags: string[]) {
  const nextErrors: FormErrors = {};
  const title = job.title.trim();
  const company = job.company.trim();
  const location = job.location.trim();
  const description = job.description.trim();
  const requirements = job.requirements.trim();
  const benefits = job.benefits.trim();
  const tagsText = tags.join(", ");

  if (title.length < 5) nextErrors.title = "Tên vị trí cần ít nhất 5 ký tự";
  else if (title.length > MAX.title) nextErrors.title = `Tên vị trí tối đa ${MAX.title} ký tự`;
  else if (!TEXT_PATTERN.test(title)) nextErrors.title = "Tên vị trí chỉ dùng chữ, số và ký tự .,'()&/+:#-";

  if (company.length < 2) nextErrors.company = "Tên công ty cần ít nhất 2 ký tự";
  else if (company.length > MAX.company) nextErrors.company = `Tên công ty tối đa ${MAX.company} ký tự`;
  else if (!TEXT_PATTERN.test(company)) nextErrors.company = "Tên công ty có ký tự không hợp lệ";

  if (location.length < 2) nextErrors.location = "Địa điểm cần ít nhất 2 ký tự";
  else if (location.length > MAX.location) nextErrors.location = `Địa điểm tối đa ${MAX.location} ký tự`;
  else if (!LOCATION_PATTERN.test(location)) nextErrors.location = "Địa điểm chỉ dùng chữ, số và ký tự .,/()&+-";

  if (!JOB_TYPES.includes(job.type as JobType)) nextErrors.type = "Hình thức làm việc không hợp lệ";
  if (!JOB_LEVELS.includes(job.level as JobLevel)) nextErrors.level = "Cấp bậc không hợp lệ";

  const salaryError = validateSalary(job.salary);
  if (salaryError) nextErrors.salary = salaryError;

  if (tagsText.length > MAX.tags) nextErrors.tags = `Tags tối đa ${MAX.tags} ký tự`;
  else if (tags.length > 12) nextErrors.tags = "Tối đa 12 tags kỹ năng";
  else {
    const invalidTag = tags.find(tag => tag.length < 2 || tag.length > 30 || !TAG_PATTERN.test(tag));
    if (invalidTag) nextErrors.tags = `Tag "${invalidTag}" phải dài 2-30 ký tự và không chứa ký tự đặc biệt lạ`;
  }

  if (description.length < 80) nextErrors.description = "Mô tả công việc cần ít nhất 80 ký tự";
  else if (description.length > MAX.description) nextErrors.description = `Mô tả tối đa ${MAX.description} ký tự`;

  if (requirements.length < 50) nextErrors.requirements = "Yêu cầu ứng viên cần ít nhất 50 ký tự";
  else if (requirements.length > MAX.requirements) nextErrors.requirements = `Yêu cầu tối đa ${MAX.requirements} ký tự`;

  if (benefits.length > MAX.benefits) nextErrors.benefits = `Quyền lợi tối đa ${MAX.benefits} ký tự`;

  return nextErrors;
}

function getTagError(tag: string, currentTags: string[]) {
  if (currentTags.length >= 12) return "Tối đa 12 tags kỹ năng";
  if (tag.length < 2) return "Tag cần ít nhất 2 ký tự";
  if (tag.length > 30) return "Mỗi tag tối đa 30 ký tự";
  if (!TAG_PATTERN.test(tag)) return "Tag không chứa ký tự đặc biệt lạ";
  if ([...currentTags, tag].join(", ").length > MAX.tags) return `Tags tối đa ${MAX.tags} ký tự`;
  return "";
}

export default function CreateEditJob() {
  const { id } = useParams();
  const { jobs, addJob, updateJob } = useData();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const isEdit = !!id;
  const existing = jobs.find(j => j.id === id);
  const initialSalary = parseSalary(existing?.salary ?? EMPTY.salary);

  const [form, setForm] = useState<Omit<Job, "id" | "posted" | "applicants">>(existing ? {
    title: existing.title, company: existing.company, location: existing.location,
    type: existing.type, level: existing.level, salary: existing.salary,
    tags: existing.tags, description: existing.description, requirements: existing.requirements,
    benefits: existing.benefits, status: existing.status, urgent: existing.urgent, logo: existing.logo,
  } : EMPTY);

  const [tags, setTags] = useState(existing?.tags || []);
  const [tagDraft, setTagDraft] = useState("");
  const [salaryAmount, setSalaryAmount] = useState(initialSalary.amount);
  const [salaryCurrency, setSalaryCurrency] = useState<SalaryCurrency>(initialSalary.currency);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!existing) return;

    const salary = parseSalary(existing.salary);

    setForm({
      title: existing.title,
      company: existing.company,
      location: existing.location,
      type: existing.type,
      level: existing.level,
      salary: buildSalary(salary.amount, salary.currency),
      tags: existing.tags,
      description: existing.description,
      requirements: existing.requirements,
      benefits: existing.benefits,
      status: existing.status,
      urgent: existing.urgent,
      logo: existing.logo,
    });
    setTags(existing.tags);
    setTagDraft("");
    setSalaryAmount(salary.amount);
    setSalaryCurrency(salary.currency);
  }, [existing]);

  async function handleSave(status?: Job["status"]) {
    const draftTag = tagDraft.trim();
    const draftTagError = draftTag ? getTagError(draftTag, tags) : "";
    const finalTags = draftTagError ? tags : cleanTagList([...tags, draftTag]);
    const finalForm = {
      ...form,
      salary: buildSalary(salaryAmount, salaryCurrency),
      tags: finalTags,
      status: status || form.status,
    };
    const validationErrors = validateJobForm(finalForm, finalTags);
    if (draftTagError) validationErrors.tags = draftTagError;

    setError("");
    setFieldErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setError("Vui lòng kiểm tra lại các trường đang báo lỗi trước khi lưu JD.");
      return;
    }

    setTags(finalTags);
    setTagDraft("");

    try {
      if (isEdit && existing) {
        await updateJob(existing.id, finalForm);
      } else {
        await addJob(finalForm);
      }
      setSaved(true);
      setTimeout(() => navigate("/admin/jobs"), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được vị trí");
    }
  }

  const baseInputCls = "w-full px-3 py-2.5 bg-input-background border rounded-xl text-sm outline-none transition-colors placeholder:text-muted-foreground";
  const inputCls = (field: JobFormField) => `${baseInputCls} ${fieldErrors[field] ? "border-red-300 focus:border-red-500" : "border-border focus:border-primary"}`;
  const selectTriggerCls = (field: JobFormField) => `h-[42px] rounded-xl bg-input-background px-3 text-sm font-semibold ${fieldErrors[field] ? "border-red-300 focus-visible:border-red-500" : "border-border focus-visible:border-primary"} focus-visible:ring-0`;
  const clearFieldError = (field: JobFormField) => setFieldErrors(errors => ({ ...errors, [field]: undefined }));
  const updateField = (field: keyof Omit<Job, "id" | "posted" | "applicants">, value: string | boolean) => {
    setForm(f => ({ ...f, [field]: value }));
    if (typeof field === "string") clearFieldError(field as JobFormField);
  };
  const updateSalaryAmount = (value: string) => {
    const amount = formatSalaryAmount(value);
    setSalaryAmount(amount);
    setForm(f => ({ ...f, salary: buildSalary(amount, salaryCurrency) }));
    clearFieldError("salary");
  };
  const updateSalaryCurrency = (value: SalaryCurrency) => {
    const currency = SALARY_CURRENCIES.includes(value as SalaryCurrency) ? value as SalaryCurrency : "VND";
    setSalaryCurrency(currency);
    setForm(f => ({ ...f, salary: buildSalary(salaryAmount, currency) }));
    clearFieldError("salary");
  };
  const addTag = (value: string) => {
    const tag = value.trim();
    if (!tag) return true;
    const exists = tags.some(current => current.toLowerCase() === tag.toLowerCase());

    if (exists) {
      setTagDraft("");
      clearFieldError("tags");
      return true;
    }

    const tagError = getTagError(tag, tags);
    if (tagError) {
      setFieldErrors(errors => ({ ...errors, tags: tagError }));
      return false;
    }

    setTags(current => [...current, tag]);
    setTagDraft("");
    clearFieldError("tags");
    return true;
  };
  const addTags = (values: string[]) => {
    let nextTags = tags;

    for (const value of values) {
      const tag = value.trim();
      if (!tag || nextTags.some(current => current.toLowerCase() === tag.toLowerCase())) continue;

      const tagError = getTagError(tag, nextTags);
      if (tagError) {
        setFieldErrors(errors => ({ ...errors, tags: tagError }));
        setTags(nextTags);
        return false;
      }

      nextTags = [...nextTags, tag];
    }

    setTags(nextTags);
    clearFieldError("tags");
    return true;
  };
  const updateTagDraft = (value: string) => {
    if (value.includes(",")) {
      const parts = value.split(",");
      const completed = parts.slice(0, -1);

      addTags(completed);
      setTagDraft(parts[parts.length - 1] ?? "");
      return;
    }

    setTagDraft(value);
    clearFieldError("tags");
  };
  const removeTag = (tag: string) => {
    setTags(current => current.filter(item => item !== tag));
    clearFieldError("tags");
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/admin/jobs" className="text-muted-foreground hover:text-primary transition-colors"><ChevronLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{isEdit ? t("admin.editJob") : t("admin.newJob")}</h1>
            <p className="text-muted-foreground text-sm">{isEdit ? existing?.title : t("admin.jobFormIntro")}</p>
          </div>
        </div>

        {saved && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-semibold">✓ {t("admin.savedRedirect")}</div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-semibold">{error}</div>
        )}

        <div className="bg-white rounded-2xl border border-border p-6 space-y-5">
          {/* Logo picker */}
          <div>
            <label className="text-xs font-bold text-foreground mb-2 block uppercase tracking-wide">{t("admin.jobIcon")}</label>
            <div className="flex gap-2 flex-wrap">
              {LOGOS.map(l => (
                <button key={l} type="button" onClick={() => setForm(f => ({ ...f, logo: l }))}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border-2 transition-all ${form.logo === l ? "border-primary bg-pink-50" : "border-border hover:border-primary/50"}`}
                >{l}</button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label={t("admin.jobTitle")} error={fieldErrors.title} hint={`${form.title.length}/${MAX.title} ký tự`}>
              <input value={form.title} onChange={e => updateField("title", e.target.value)} placeholder="Senior Product Designer" maxLength={MAX.title} aria-invalid={Boolean(fieldErrors.title)} className={inputCls("title")} />
            </FormField>
            <FormField label={t("admin.companyName")} error={fieldErrors.company} hint={`${form.company.length}/${MAX.company} ký tự`}>
              <input value={form.company} onChange={e => updateField("company", e.target.value)} placeholder="Bloom Creative Studio" maxLength={MAX.company} aria-invalid={Boolean(fieldErrors.company)} className={inputCls("company")} />
            </FormField>
            <FormField label={t("admin.location")} error={fieldErrors.location} hint={`${form.location.length}/${MAX.location} ký tự`}>
              <input value={form.location} onChange={e => updateField("location", e.target.value)} placeholder="Hà Nội / Remote / TP.HCM" maxLength={MAX.location} aria-invalid={Boolean(fieldErrors.location)} className={inputCls("location")} />
            </FormField>
            <FormField label={t("admin.salary")} error={fieldErrors.salary} hint="Có thể để trống, hoặc nhập dạng 20,000,000 - 30,000,000">
              <div className={`flex overflow-hidden rounded-xl border bg-input-background transition-colors ${fieldErrors.salary ? "border-red-300 focus-within:border-red-500" : "border-border focus-within:border-primary"}`}>
                <input
                  value={salaryAmount}
                  onChange={e => updateSalaryAmount(e.target.value)}
                  inputMode="numeric"
                  placeholder="1,000,000"
                  maxLength={MAX.salary}
                  aria-invalid={Boolean(fieldErrors.salary)}
                  className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
                />
                <Select
                  value={salaryCurrency}
                  onValueChange={value => updateSalaryCurrency(value as SalaryCurrency)}
                >
                  <SelectTrigger className="h-[42px] w-[92px] rounded-none border-0 border-l border-border bg-white px-3 text-sm font-bold focus-visible:border-border focus-visible:ring-0 data-[state=open]:bg-white [&>svg]:size-3.5" aria-label="Đơn vị tiền tệ">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end" className="rounded-xl border-border bg-white p-1 shadow-lg">
                    {SALARY_CURRENCIES.map(currency => <SelectItem key={currency} value={currency} className="rounded-lg font-semibold">{currency}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </FormField>
            <FormField label={t("admin.workType")} error={fieldErrors.type}>
              <Select value={form.type} onValueChange={value => updateField("type", value)}>
                <SelectTrigger className={selectTriggerCls("type")} aria-invalid={Boolean(fieldErrors.type)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border bg-white p-1 shadow-lg">
                  {JOB_TYPES.map(type => <SelectItem key={type} value={type} className="rounded-lg font-semibold">{translateJobType(type, language)}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={t("admin.level")} error={fieldErrors.level}>
              <Select value={form.level} onValueChange={value => updateField("level", value)}>
                <SelectTrigger className={selectTriggerCls("level")} aria-invalid={Boolean(fieldErrors.level)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border bg-white p-1 shadow-lg">
                  {JOB_LEVELS.map(level => <SelectItem key={level} value={level} className="rounded-lg font-semibold">{translateJobLevel(level, language)}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={t("admin.skillTags")} error={fieldErrors.tags} hint={`${tags.length}/12 tags. Bấm Tab, Enter hoặc dấu phẩy để tạo tag`} span2>
              <div
                className={`flex min-h-[46px] w-full flex-wrap items-center gap-2 rounded-xl border bg-input-background px-2 py-2 text-sm transition-colors ${fieldErrors.tags ? "border-red-300 focus-within:border-red-500" : "border-border focus-within:border-primary"}`}
                onClick={event => {
                  const input = event.currentTarget.querySelector("input");
                  input?.focus();
                }}
              >
                {tags.map(tag => (
                  <span key={tag} className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 text-xs font-bold text-primary">
                    <span className="max-w-[220px] truncate">{tag}</span>
                    <button
                      type="button"
                      onClick={event => {
                        event.stopPropagation();
                        removeTag(tag);
                      }}
                      className="rounded-full p-0.5 text-primary/70 hover:bg-primary/10 hover:text-primary"
                      aria-label={`Xóa tag ${tag}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input
                  value={tagDraft}
                  onChange={e => updateTagDraft(e.target.value)}
                  onKeyDown={event => {
                    if ((event.key === "Tab" || event.key === "Enter" || event.key === ",") && tagDraft.trim()) {
                      event.preventDefault();
                      addTag(tagDraft);
                    }

                    if (event.key === "Backspace" && !tagDraft && tags.length > 0) {
                      removeTag(tags[tags.length - 1]);
                    }
                  }}
                  onBlur={() => {
                    if (tagDraft.trim()) addTag(tagDraft);
                  }}
                  placeholder={tags.length ? "Thêm tag..." : "React, TypeScript, Figma..."}
                  maxLength={30}
                  aria-invalid={Boolean(fieldErrors.tags)}
                  className="h-7 min-w-[150px] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </FormField>
            <FormField label={t("admin.jobDescriptionLabel")} error={fieldErrors.description} hint={`${form.description.length}/${MAX.description} ký tự, tối thiểu 80`} span2>
              <textarea rows={5} value={form.description} onChange={e => updateField("description", e.target.value)} placeholder="Mô tả về vị trí, team, và công việc hàng ngày..." maxLength={MAX.description} aria-invalid={Boolean(fieldErrors.description)} className={inputCls("description") + " resize-none"} />
            </FormField>
            <FormField label={t("admin.requirementsLabel")} error={fieldErrors.requirements} hint={`${form.requirements.length}/${MAX.requirements} ký tự, tối thiểu 50`} span2>
              <textarea rows={5} value={form.requirements} onChange={e => updateField("requirements", e.target.value)} placeholder="- 3+ năm kinh nghiệm...\n- Thành thạo..." maxLength={MAX.requirements} aria-invalid={Boolean(fieldErrors.requirements)} className={inputCls("requirements") + " resize-none"} />
            </FormField>
            <FormField label={t("admin.benefitsLabel")} error={fieldErrors.benefits} hint={`${form.benefits.length}/${MAX.benefits} ký tự, có thể để trống`} span2>
              <textarea rows={4} value={form.benefits} onChange={e => updateField("benefits", e.target.value)} placeholder="- Lương cạnh tranh\n- MacBook M2\n- Remote 2 ngày/tuần..." maxLength={MAX.benefits} aria-invalid={Boolean(fieldErrors.benefits)} className={inputCls("benefits") + " resize-none"} />
            </FormField>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.urgent} onChange={e => updateField("urgent", e.target.checked)} className="w-4 h-4 accent-pink-500" />
            <span className="text-sm font-semibold text-foreground">🔥 {t("admin.markUrgent")}</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button onClick={() => handleSave("published")} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-sm">
              <Globe size={15} /> {t("admin.publishNow")}
            </button>
            <button onClick={() => handleSave(isEdit ? undefined : "draft")} className="flex items-center gap-2 px-5 py-2.5 border border-border rounded-xl text-sm font-bold text-muted-foreground hover:border-primary hover:text-primary transition-all">
              <FileText size={15} /> {isEdit ? t("admin.saveChanges") : t("admin.saveDraft")}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
