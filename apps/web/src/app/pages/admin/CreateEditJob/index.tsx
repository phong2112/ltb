import { lazy, Suspense, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { Check, Flame, X } from "lucide-react";
import { useData, Job } from "@/app/data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/Common/select";
import { translateJobLevel, translateJobType, useLanguage } from "@/app/services/i18n-service";
import JobApplicantsAside from "@/app/components/JobApplicantsAside";
import AdminLayout from "@/app/layouts/AdminLayout";
import { getMeaningfulRichTextLength as getMeaningfulTextLength } from "@/app/utils/helpers/rich-text";
import { CreateEditJobHeader, FormField, JobQuestionSection } from "./components";
import {
  EMPTY_JOB_FORM,
  JOB_LEVELS,
  JOB_LOCATIONS,
  JOB_TYPES,
  LOGOS,
  MAX,
  MAX_SALARY_AMOUNT,
  MAX_SALARY_DISPLAY,
  SALARY_CURRENCIES,
} from "./constants";
import type { FormErrors, JobForm, JobFormField, SalaryCurrency, SavingAction } from "./types";
import {
  buildSalary,
  cleanTagList,
  countSalaryTokens,
  createLocalQuestionId,
  findSalaryCaret,
  formatSalaryAmount,
  getTagError,
  isSalaryCurrency,
  orderQuestions,
  parseSalary,
  validateJobForm,
} from "./utils";

const RichTextEditor = lazy(() => import("@/app/components/RichTextEditor"));

export default function CreateEditJob() {
  const { id } = useParams();
  const { jobs, addJob, updateJob } = useData();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const isEdit = !!id;
  const existing = jobs.find(j => j.id === id);
  const initialSalary = parseSalary(existing?.salary ?? EMPTY_JOB_FORM.salary);

  const [form, setForm] = useState<JobForm>(existing ? {
    title: existing.title, company: existing.company, locations: existing.locations,
    type: existing.type, level: existing.level, salary: existing.salary,
    tags: existing.tags, description: existing.description, requirements: existing.requirements,
    benefits: existing.benefits, status: existing.status, urgent: existing.urgent, logo: existing.logo,
    questions: existing.questions,
  } : EMPTY_JOB_FORM);

  const [tags, setTags] = useState(existing?.tags || []);
  const [tagDraft, setTagDraft] = useState("");
  const [salaryAmount, setSalaryAmount] = useState(initialSalary.amount);
  const [salaryCurrency, setSalaryCurrency] = useState<SalaryCurrency>(initialSalary.currency);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [savingAction, setSavingAction] = useState<SavingAction | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!existing) return;

    const salary = parseSalary(existing.salary);

    setForm({
      title: existing.title,
      company: existing.company,
      locations: existing.locations,
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
      questions: existing.questions,
    });
    setTags(existing.tags);
    setTagDraft("");
    setSalaryAmount(salary.amount);
    setSalaryCurrency(salary.currency);
  }, [existing]);

  async function handleSave(action: SavingAction, status?: Job["status"]) {
    if (savingRef.current) return;

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
    savingRef.current = true;
    setSavingAction(action);

    try {
      if (isEdit && existing) {
        await updateJob(existing.id, finalForm);
      } else {
        await addJob(finalForm);
      }
      setSaved(true);
      setTimeout(() => navigate(isEdit && existing ? `/admin/jobs/${existing.id}` : "/admin/jobs"), 1000);
    } catch (err) {
      savingRef.current = false;
      setSavingAction(null);
      setError(err instanceof Error ? err.message : "Không lưu được vị trí");
    }
  }

  const baseInputCls = "w-full px-3 py-2.5 bg-input-background border rounded-xl text-sm outline-none transition-colors placeholder:text-muted-foreground";
  const inputCls = (field: JobFormField) => `${baseInputCls} ${fieldErrors[field] ? "border-red-300 focus:border-red-500" : "border-border focus:border-primary"}`;
  const selectTriggerCls = (field: JobFormField) => `h-[42px] data-[size=default]:h-[42px] rounded-xl bg-input-background px-3 text-sm font-semibold ${fieldErrors[field] ? "border-red-300 focus-visible:border-red-500" : "border-border focus-visible:border-primary"} focus-visible:ring-0`;
  const clearFieldError = (field: JobFormField) => setFieldErrors(errors => ({ ...errors, [field]: undefined }));
  const updateField = (field: keyof JobForm, value: string | boolean | string[]) => {
    setForm(f => ({ ...f, [field]: value }));
    if (typeof field === "string") clearFieldError(field as JobFormField);
  };
  const toggleLocation = (location: typeof JOB_LOCATIONS[number]) => {
    setForm(current => {
      const selected = current.locations.includes(location);
      return {
        ...current,
        locations: selected ? current.locations.filter(item => item !== location) : [...current.locations, location],
      };
    });
    clearFieldError("locations");
  };
  const updateSalaryAmount = (value: string) => {
    const amount = formatSalaryAmount(value);
    setSalaryAmount(amount);
    setForm(f => ({ ...f, salary: buildSalary(amount, salaryCurrency) }));
    clearFieldError("salary");
    return amount;
  };
  const restoreSalaryCaret = (input: HTMLInputElement, amount: string, tokenOffset: number) => {
    requestAnimationFrame(() => {
      if (!input.isConnected || document.activeElement !== input) return;
      const caret = findSalaryCaret(amount, tokenOffset);
      input.setSelectionRange(caret, caret);
    });
  };
  const handleSalaryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const tokenOffset = countSalaryTokens(input.value.slice(0, input.selectionStart ?? input.value.length));
    const amount = updateSalaryAmount(input.value);
    restoreSalaryCaret(input, amount, tokenOffset);
  };
  const handleSalaryKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Backspace" && event.key !== "Delete") return;

    const input = event.currentTarget;
    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;
    if (selectionStart === null || selectionEnd === null || selectionStart !== selectionEnd) return;

    const separatorIndex = event.key === "Backspace" ? selectionStart - 1 : selectionStart;
    const separator = input.value[separatorIndex];
    if (!separator || /\d/.test(separator)) return;

    let tokenIndex = separatorIndex;
    const step = event.key === "Backspace" ? -1 : 1;
    if (separator !== "-") tokenIndex += step;
    while (tokenIndex >= 0 && tokenIndex < input.value.length && !/\d|-/.test(input.value[tokenIndex])) {
      tokenIndex += step;
    }
    if (tokenIndex < 0 || tokenIndex >= input.value.length) return;

    event.preventDefault();
    const tokenOffset = countSalaryTokens(input.value.slice(0, tokenIndex));
    const rawAmount = input.value.slice(0, tokenIndex) + input.value.slice(tokenIndex + 1);
    const amount = updateSalaryAmount(rawAmount);
    restoreSalaryCaret(input, amount, tokenOffset);
  };
  const updateSalaryCurrency = (value: SalaryCurrency) => {
    const currency = isSalaryCurrency(value) ? value : "VND";
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
  const addQuestion = () => {
    setForm(current => {
      if (current.questions.length >= MAX.questions) {
        setFieldErrors(errors => ({ ...errors, questions: `Tối đa ${MAX.questions} câu hỏi sàng lọc` }));
        return current;
      }

      clearFieldError("questions");
      return {
        ...current,
        questions: [
          ...current.questions,
          {
            id: createLocalQuestionId(),
            label: "",
            required: false,
            sortOrder: current.questions.length,
          },
        ],
      };
    });
  };
  const updateQuestion = (id: string, patch: Partial<Job["questions"][number]>) => {
    setForm(current => ({
      ...current,
      questions: current.questions.map(question => question.id === id ? { ...question, ...patch } : question),
    }));
    clearFieldError("questions");
  };
  const removeQuestion = (id: string) => {
    setForm(current => ({
      ...current,
      questions: orderQuestions(current.questions.filter(question => question.id !== id)),
    }));
    clearFieldError("questions");
  };
  const moveQuestion = (id: string, direction: -1 | 1) => {
    setForm(current => {
      const index = current.questions.findIndex(question => question.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.questions.length) return current;

      const nextQuestions = [...current.questions];
      const [question] = nextQuestions.splice(index, 1);
      nextQuestions.splice(nextIndex, 0, question);
      return {
        ...current,
        questions: orderQuestions(nextQuestions),
      };
    });
    clearFieldError("questions");
  };
  const showPublishAction = !isEdit;

  return (
    <AdminLayout>
      <div className="w-full max-w-[1560px]">
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <CreateEditJobHeader
            existing={existing}
            form={form}
            isEdit={isEdit}
            language={language}
            savingAction={savingAction}
            showPublishAction={showPublishAction}
            t={t}
            onSave={(action, status) => void handleSave(action, status)}
          />

          {isEdit && existing && <JobApplicantsAside jobId={existing.id} />}

          <div className="min-w-0 space-y-4 xl:col-start-1">

            {saved && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-semibold">✓ {t("admin.savedRedirect")}</div>
            )}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-semibold">{error}</div>
            )}

            <div className="space-y-5 rounded-2xl border border-border bg-white p-4 sm:p-6">
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
            <FormField label={t("admin.location")} error={fieldErrors.locations} hint={`${form.locations.length}/${JOB_LOCATIONS.length} địa điểm`}>
              <div
                className={`grid grid-cols-2 gap-2 rounded-xl border bg-input-background p-2 transition-colors sm:grid-cols-3 ${fieldErrors.locations ? "border-red-300 focus-within:border-red-500" : "border-border focus-within:border-primary"}`}
                aria-invalid={Boolean(fieldErrors.locations)}
              >
                {JOB_LOCATIONS.map(location => {
                  const selected = form.locations.includes(location);

                  return (
                    <button
                      key={location}
                      type="button"
                      onClick={() => toggleLocation(location)}
                      aria-pressed={selected}
                      className={`flex h-9 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-bold transition-colors ${selected ? "border-primary bg-primary text-white shadow-sm" : "border-border bg-white text-foreground hover:border-primary/50 hover:bg-pink-50"}`}
                    >
                      {selected && <Check size={13} className="flex-none" />}
                      <span className="truncate">{location}</span>
                    </button>
                  );
                })}
              </div>
            </FormField>
            <FormField label={t("admin.salary")} error={fieldErrors.salary} hint={`Có thể để trống hoặc nhập khoảng. Tối đa ${MAX_SALARY_DISPLAY}`}>
              <div className={`flex h-[42px] overflow-hidden rounded-xl border bg-input-background transition-colors ${fieldErrors.salary ? "border-red-300 focus-within:border-red-500" : "border-border focus-within:border-primary"}`}>
                <input
                  value={salaryAmount}
                  onChange={handleSalaryChange}
                  onKeyDown={handleSalaryKeyDown}
                  inputMode="numeric"
                  placeholder="1,000,000"
                  maxLength={MAX_SALARY_AMOUNT}
                  aria-invalid={Boolean(fieldErrors.salary)}
                  className="h-full min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
                />
                <Select
                  value={salaryCurrency}
                  onValueChange={value => updateSalaryCurrency(value as SalaryCurrency)}
                >
                  <SelectTrigger className="h-full w-[92px] rounded-none border-0 border-l border-border bg-transparent px-3 text-sm font-bold focus-visible:border-border focus-visible:ring-0 data-[size=default]:h-full data-[state=open]:bg-transparent [&>svg]:size-3.5 [&>svg]:opacity-70" aria-label="Đơn vị tiền tệ">
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
                  className="h-7 min-w-[100px] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground sm:min-w-[150px]"
                />
              </div>
            </FormField>
            <FormField label={t("admin.jobDescriptionLabel")} error={fieldErrors.description} hint={`${getMeaningfulTextLength(form.description)}/${MAX.description} ký tự nội dung, tối thiểu 80`} span2>
              <Suspense fallback={<div className="h-[170px] animate-pulse rounded-xl border border-border bg-input-background" />}>
                <RichTextEditor value={form.description} onChange={value => updateField("description", value)} label={t("admin.jobDescriptionLabel")} placeholder="Mô tả về vị trí, team, và công việc hàng ngày..." invalid={Boolean(fieldErrors.description)} />
              </Suspense>
            </FormField>
            <FormField label={t("admin.requirementsLabel")} error={fieldErrors.requirements} hint={`${getMeaningfulTextLength(form.requirements)}/${MAX.requirements} ký tự nội dung, tối thiểu 50`} span2>
              <Suspense fallback={<div className="h-[170px] animate-pulse rounded-xl border border-border bg-input-background" />}>
                <RichTextEditor value={form.requirements} onChange={value => updateField("requirements", value)} label={t("admin.requirementsLabel")} placeholder="3+ năm kinh nghiệm, kỹ năng chuyên môn..." invalid={Boolean(fieldErrors.requirements)} />
              </Suspense>
            </FormField>
            <FormField label={t("admin.benefitsLabel")} error={fieldErrors.benefits} hint={`${getMeaningfulTextLength(form.benefits)}/${MAX.benefits} ký tự nội dung, có thể để trống`} span2>
              <Suspense fallback={<div className="h-[170px] animate-pulse rounded-xl border border-border bg-input-background" />}>
                <RichTextEditor value={form.benefits} onChange={value => updateField("benefits", value)} label={t("admin.benefitsLabel")} placeholder="Lương cạnh tranh, thiết bị làm việc, chính sách remote..." invalid={Boolean(fieldErrors.benefits)} />
              </Suspense>
            </FormField>
            <JobQuestionSection
              questions={form.questions}
              error={fieldErrors.questions}
              onAddQuestion={addQuestion}
              onMoveQuestion={moveQuestion}
              onRemoveQuestion={removeQuestion}
              onUpdateQuestion={updateQuestion}
            />
          </div>

          <button
            type="button"
            onClick={() => updateField("urgent", !form.urgent)}
            aria-pressed={form.urgent}
            className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-all ${
              form.urgent
                ? "border-rose-200 bg-rose-50 text-rose-700 shadow-[0_10px_24px_rgba(225,29,72,0.08)]"
                : "border-border bg-background/60 text-foreground hover:border-primary/30 hover:bg-pink-50/70"
            }`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className={`flex size-10 flex-none items-center justify-center rounded-xl ${form.urgent ? "bg-rose-100 text-rose-600" : "bg-white text-muted-foreground ring-1 ring-border"}`}>
                <Flame size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black">{t("admin.markUrgent")}</span>
                <span className="mt-0.5 block text-xs font-semibold text-muted-foreground">
                  {form.urgent ? "Tin tuyển dụng sẽ được gắn nhãn nổi bật." : "Bật khi vị trí cần ưu tiên tuyển nhanh."}
                </span>
              </span>
            </span>
            <span className={`flex h-6 w-11 flex-none items-center rounded-full p-0.5 transition-colors ${form.urgent ? "bg-rose-500" : "bg-muted"}`}>
              <span className={`flex size-5 items-center justify-center rounded-full bg-white text-rose-600 shadow-sm transition-transform ${form.urgent ? "translate-x-5" : "translate-x-0"}`}>
                {form.urgent && <Check size={12} />}
              </span>
            </span>
          </button>

            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
