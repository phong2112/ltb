import { lazy, Suspense, useState, useEffect, useRef, type ChangeEvent, type KeyboardEvent, type ReactNode } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { Archive, ArrowDown, ArrowUp, Check, ChevronDown, ChevronLeft, CircleStop, ExternalLink, FileText, Flame, Globe, LoaderCircle, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useData, Job } from "@/app/data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { translateJobLevel, translateJobStatus, translateJobType, useLanguage } from "@/app/i18n";
import JobApplicantsAside from "@/app/components/JobApplicantsAside";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import AdminLayout from "@/app/layouts/AdminLayout";
import { getMeaningfulRichTextLength as getMeaningfulTextLength } from "@/app/lib/rich-text";
import { URGENT_BADGE_CLASS } from "@/app/status-config";

const RichTextEditor = lazy(() => import("@/app/components/RichTextEditor"));

const statusDotClass: Record<Job["status"], string> = {
  published: "bg-emerald-500",
  draft: "bg-slate-400",
  closed: "bg-amber-500",
  archived: "bg-slate-600",
};

const DEFAULT_JOB_DESCRIPTION = [
  "<h3>About VinSmart Future:</h3>",
  "<p><em>VinSmartFuture (formerly VinIT) is a technology subsidiary of <strong>Vingroup</strong>, leading the development of a comprehensive <strong>SuperApp and digital ecosystem</strong> that serves tens of millions of users across key sectors: payments, healthcare, education, mobility, commerce, and entertainment.</em></p>",
  "<p><em>Our mission is to build the <strong>\"Digital Core\"</strong> - the foundational technology platform that powers Vingroup's unified digital operations, enabling smart management, data-driven decision-making, and scalable infrastructure on a national level.</em></p>",
  "<p><em><strong>Work Location:</strong></em></p>",
  "<ul>",
  "<li><p><em><strong>Hanoi:</strong> TechnoPark Tower, Vinhomes Ocean Park, Hanoi</em></p></li>",
  "<li><p><em><strong>HCM:</strong> Vincom Dong Khoi, HCM</em></p></li>",
  "</ul>",
  "<h3>Job overview:</h3>",
  "<p><br></p>",
].join("");

const DEFAULT_JOB_BENEFITS = [
  "<ul>",
  "<li><p>Flexible working hours and attendance policy. Work from home on alternate working Saturdays.</p></li>",
  "<li><p>Attractive compensation package and competitive bonus schemes.</p></li>",
  "<li><p>Lunch allowance.</p></li>",
  "<li><p>Exclusive benefits across Vingroup's ecosystem, including preferential rates for education (Vinschool), healthcare services (Vinmec), hospitality and resorts (Vinpearl), vehicle purchases (VinFast), and housing rental and ownership programs (Vinhomes), in accordance with the Group's policies.</p></li>",
  "<li><p>Full statutory insurance coverage in accordance with Vietnamese Labor Law, including Social Insurance, Health Insurance, and Unemployment Insurance.</p></li>",
  "<li><p>Additional private healthcare insurance provided based on job grade and position.</p></li>",
  "<li><p>Annual health check-ups at reputable hospitals and healthcare centers nationwide.</p></li>",
  "<li><p>Opportunity to participate in large-scale, strategic technology projects.</p></li>",
  "<li><p>Opportunity to work in a professional technology environment alongside scientists, experts, and engineers from leading technology companies in Vietnam and around the world.</p></li>",
  "<li><p>Access to free learning resources on Udemy, Coursera, and O'Reilly, as well as internal workshops and seminars.</p></li>",
  "<li><p>Sponsorship for professional certifications and special mentorship programs from Company and Group leadership.</p></li>",
  "<li><p>Opportunity to join Vingroup's technology clubs and internal technology communities, contributing ideas and projects to real-world applications.</p></li>",
  "<li><p>Internal Trainer development programs with special benefits for knowledge-sharing contributors.</p></li>",
  "<li><p>12 annual leave days, plus public holidays in accordance with Vietnamese Labor Law.</p></li>",
  "<li><p>Participation in company activities, team-building programs, and annual corporate events.</p></li>",
  "</ul>",
].join("");

type JobForm = Omit<Job, "id" | "posted" | "applicants" | "location">;

const EMPTY: JobForm = {
  title: "", company: "", locations: [], type: "Full-time", level: "Mid-level",
  salary: "", tags: [], description: DEFAULT_JOB_DESCRIPTION, requirements: "", benefits: DEFAULT_JOB_BENEFITS,
  status: "draft", urgent: false, logo: "🌷", questions: [],
};

const LOGOS = ["🌸", "🌹", "🌷", "🍑", "💻", "📊", "🎨", "🌿", "⭐", "🦋"];
const SALARY_CURRENCIES = ["VND", "USD"] as const;
const MAX_SALARY_VALUE = 1_000_000_000_000;
const MAX_SALARY_DISPLAY = "1,000,000,000,000";
const JOB_LOCATIONS = ["Hà Nội", "Đà Nẵng", "Hải Phòng", "Quảng Ninh", "TP Hồ Chí Minh", "Remote"] as const;
const JOB_TYPES = ["Full-time", "Hybrid", "Remote", "Part-time"] as const;
const JOB_LEVELS = ["Intern", "Junior", "Mid-level", "Senior", "Manager", "Director"] as const;
const TEXT_PATTERN = /^[\p{L}\p{N}\s.,'’()&/+:#-]+$/u;
const TAG_PATTERN = /^[\p{L}\p{N}\s+#./-]+$/u;
const MAX = {
  title: 120,
  company: 100,
  salary: 40,
  tags: 240,
  description: 5000,
  requirements: 4000,
  benefits: 3000,
  questions: 10,
  questionLabel: 300,
};
const MAX_SALARY_AMOUNT = MAX.salary - " VND".length;

type SalaryCurrency = typeof SALARY_CURRENCIES[number];
type JobType = typeof JOB_TYPES[number];
type JobLevel = typeof JOB_LEVELS[number];
type SavingAction = "publish" | "save";
type JobFormField = "title" | "company" | "locations" | "salary" | "type" | "level" | "tags" | "description" | "requirements" | "benefits" | "questions";
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
  const separatorIndex = normalized.indexOf("-");

  if (separatorIndex >= 0) {
    const min = normalized.slice(0, separatorIndex);
    const max = normalized.slice(separatorIndex + 1);
    const formattedMin = formatNumberString(min);
    const formattedMax = formatNumberString(max);

    // Do not leave an unusable leading separator, and retain digits pasted
    // after an accidental second separator instead of silently dropping them.
    if (!formattedMin) return formattedMax;
    return formattedMax ? `${formattedMin} - ${formattedMax}` : `${formattedMin} - `;
  }

  return formatNumberString(normalized);
}

function formatNumberString(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function countSalaryTokens(value: string) {
  return [...value].filter(character => /\d|-/.test(character)).length;
}

function findSalaryCaret(value: string, tokenOffset: number) {
  if (tokenOffset <= 0) return 0;

  let tokensSeen = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (/\d|-/.test(value[index])) tokensSeen += 1;
    if (tokensSeen === tokenOffset) return index + 1;
  }

  return value.length;
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

  if (parts.some(part => parseSalaryNumber(part) > MAX_SALARY_VALUE)) {
    return `Mức lương tối đa là ${MAX_SALARY_DISPLAY}`;
  }

  if (parts.length === 2 && parseSalaryNumber(parts[0]) >= parseSalaryNumber(parts[1])) {
    return "Mức lương tối thiểu phải nhỏ hơn mức tối đa";
  }

  return "";
}

function validateJobForm(job: JobForm, tags: string[]) {
  const nextErrors: FormErrors = {};
  const title = job.title.trim();
  const company = job.company.trim();
  const description = job.description.trim();
  const requirements = job.requirements.trim();
  const descriptionMeaningfulLength = getMeaningfulTextLength(description);
  const requirementsMeaningfulLength = getMeaningfulTextLength(requirements);
  const benefits = job.benefits.trim();
  const benefitsMeaningfulLength = getMeaningfulTextLength(benefits);
  const tagsText = tags.join(", ");

  if (title.length < 5) nextErrors.title = "Tên vị trí cần ít nhất 5 ký tự";
  else if (title.length > MAX.title) nextErrors.title = `Tên vị trí tối đa ${MAX.title} ký tự`;
  else if (!TEXT_PATTERN.test(title)) nextErrors.title = "Tên vị trí chỉ dùng chữ, số và ký tự .,'()&/+:#-";

  if (company.length < 2) nextErrors.company = "Tên công ty cần ít nhất 2 ký tự";
  else if (company.length > MAX.company) nextErrors.company = `Tên công ty tối đa ${MAX.company} ký tự`;
  else if (!TEXT_PATTERN.test(company)) nextErrors.company = "Tên công ty có ký tự không hợp lệ";

  if (job.locations.length === 0) {
    nextErrors.locations = "Vui lòng chọn ít nhất một địa điểm";
  } else if (job.locations.some(location => !JOB_LOCATIONS.includes(location as typeof JOB_LOCATIONS[number]))) {
    nextErrors.locations = "Danh sách địa điểm có lựa chọn không hợp lệ";
  }

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

  if (descriptionMeaningfulLength < 80) nextErrors.description = "Mô tả công việc cần ít nhất 80 ký tự nội dung";
  else if (descriptionMeaningfulLength > MAX.description) nextErrors.description = `Mô tả tối đa ${MAX.description} ký tự nội dung`;

  if (requirementsMeaningfulLength < 50) nextErrors.requirements = "Yêu cầu ứng viên cần ít nhất 50 ký tự nội dung";
  else if (requirementsMeaningfulLength > MAX.requirements) nextErrors.requirements = `Yêu cầu tối đa ${MAX.requirements} ký tự nội dung`;

  if (benefitsMeaningfulLength > MAX.benefits) nextErrors.benefits = `Quyền lợi tối đa ${MAX.benefits} ký tự nội dung`;

  if (job.questions.length > MAX.questions) nextErrors.questions = `Tối đa ${MAX.questions} câu hỏi sàng lọc`;
  else {
    const invalidQuestionIndex = job.questions.findIndex(question => {
      const label = question.label.trim();
      return label.length < 5 || label.length > MAX.questionLabel;
    });

    if (invalidQuestionIndex >= 0) {
      nextErrors.questions = `Câu hỏi ${invalidQuestionIndex + 1} cần dài 5-${MAX.questionLabel} ký tự`;
    }
  }

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

function createLocalQuestionId() {
  return `local-question-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function orderQuestions(questions: Job["questions"]) {
  return questions.map((question, index) => ({
    ...question,
    sortOrder: index,
  }));
}

export default function CreateEditJob() {
  const { id } = useParams();
  const { jobs, addJob, updateJob } = useData();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const isEdit = !!id;
  const existing = jobs.find(j => j.id === id);
  const initialSalary = parseSalary(existing?.salary ?? EMPTY.salary);

  const [form, setForm] = useState<JobForm>(existing ? {
    title: existing.title, company: existing.company, locations: existing.locations,
    type: existing.type, level: existing.level, salary: existing.salary,
    tags: existing.tags, description: existing.description, requirements: existing.requirements,
    benefits: existing.benefits, status: existing.status, urgent: existing.urgent, logo: existing.logo,
    questions: existing.questions,
  } : EMPTY);

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
          <header className="sticky top-16 z-20 min-w-0 rounded-2xl border border-border/80 bg-white px-4 py-4 shadow-[0_10px_30px_rgba(120,70,86,0.06)] sm:px-5 md:top-20">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <Link to={isEdit && existing ? `/admin/jobs/${existing.id}` : "/admin/jobs"} className="mb-2 inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-muted-foreground transition-colors hover:text-primary">
                  <ChevronLeft size={14} /> {t("common.backToList")}
                </Link>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-black leading-tight text-foreground">{isEdit ? form.title || existing?.title : t("admin.newJob")}</h1>
                  {form.urgent && <span className={`flex-none rounded-full border px-2 py-0.5 text-[10px] font-bold ${URGENT_BADGE_CLASS}`}>🔥 {t("jobs.urgent")}</span>}
                </div>
                <p className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <span className="text-base leading-none" aria-hidden="true">{form.logo}</span>
                  <span className="truncate">{isEdit ? form.company || existing?.company : t("admin.jobFormIntro")}</span>
                </p>
              </div>

              <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
                {isEdit && existing && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        disabled={savingAction !== null}
                        className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-border bg-white px-3.5 text-sm font-bold text-foreground transition-colors hover:border-primary/40 hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={`${t("admin.status")}: ${translateJobStatus(existing.status, language)}`}
                      >
                        {savingAction ? <LoaderCircle size={14} className="animate-spin text-primary" /> : <span className={`size-2 rounded-full ${statusDotClass[existing.status]}`} />}
                        {translateJobStatus(existing.status, language)}
                        <ChevronDown size={14} className="text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5">
                      {existing.status === "archived" ? (
                        <DropdownMenuItem onSelect={() => void handleSave("save", "closed")} className="cursor-pointer rounded-lg py-2 font-semibold">
                          <RotateCcw /> {t("admin.restoreJob")}
                        </DropdownMenuItem>
                      ) : (
                        <>
                          {existing.status === "published" ? (
                            <DropdownMenuItem onSelect={() => void handleSave("save", "closed")} className="cursor-pointer rounded-lg py-2 font-semibold text-amber-700 focus:text-amber-700">
                              <CircleStop className="text-amber-600" /> {t("admin.closeJob")}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onSelect={() => void handleSave("publish", "published")} className="cursor-pointer rounded-lg py-2 font-semibold text-emerald-700 focus:text-emerald-700">
                              <Globe className="text-emerald-600" /> {t("common.publish")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={() => void handleSave("save", "archived")} className="cursor-pointer rounded-lg py-2 font-semibold">
                            <Archive /> {t("admin.archiveJob")}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {isEdit && existing?.status === "published" && (
                  <Link to={`/jobs/${existing.id}`} target="_blank" rel="noreferrer" className="flex h-10 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-pink-50 hover:text-primary">
                    <ExternalLink size={14} /> {t("admin.viewPublic")}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => handleSave("save", isEdit ? undefined : "draft")}
                  disabled={savingAction !== null}
                  aria-busy={savingAction === "save"}
                  className={`flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none ${showPublishAction ? "border border-border bg-white px-3.5 text-foreground hover:border-primary/40 hover:bg-pink-50 disabled:hover:border-border disabled:hover:bg-white" : "bg-primary px-4 text-white shadow-sm hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md disabled:hover:translate-y-0 disabled:hover:bg-primary"}`}
                >
                  {savingAction === "save" ? <LoaderCircle size={14} className="animate-spin" /> : <FileText size={14} />}
                  {savingAction === "save" ? t("admin.saving") : isEdit ? t("admin.saveChanges") : t("admin.saveDraft")}
                </button>
                {showPublishAction && (
                  <button
                    type="button"
                    onClick={() => handleSave("publish", "published")}
                    disabled={savingAction !== null}
                    aria-busy={savingAction === "publish"}
                    className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-primary sm:flex-none"
                  >
                    {savingAction === "publish" ? <LoaderCircle size={14} className="animate-spin" /> : <Globe size={14} />}
                    {savingAction === "publish" ? t("admin.publishing") : t("admin.publishNow")}
                  </button>
                )}
              </div>
            </div>
          </header>

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
                  className="h-7 min-w-[150px] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
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
            <FormField
              label="Câu hỏi sàng lọc"
              error={fieldErrors.questions}
              hint={`${form.questions.length}/${MAX.questions} câu hỏi. Bật bắt buộc cho câu hỏi cần ứng viên trả lời trước khi gửi hồ sơ.`}
              span2
            >
              <div className={`space-y-3 rounded-2xl border bg-background/60 p-3 ${fieldErrors.questions ? "border-red-300" : "border-border/80"}`}>
                {form.questions.length > 0 ? (
                  form.questions.map((question, index) => (
                    <div key={question.id} className="grid gap-2 rounded-xl border border-border bg-white p-3 sm:grid-cols-[auto_minmax(0,1fr)] lg:grid-cols-[auto_minmax(0,1fr)_auto_auto] lg:items-start">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-xs font-black text-primary">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <textarea
                        value={question.label}
                        onChange={event => updateQuestion(question.id, { label: event.target.value })}
                        placeholder="Ví dụ: Bạn có bao nhiêu năm kinh nghiệm với React và TypeScript?"
                        rows={2}
                        maxLength={MAX.questionLabel}
                        aria-invalid={Boolean(fieldErrors.questions)}
                        className="min-h-[76px] w-full resize-y rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm leading-5 outline-none transition-colors placeholder:text-muted-foreground focus:border-primary sm:col-start-2"
                      />
                      <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-border bg-background/60 px-3 text-xs font-bold text-foreground sm:col-start-2 lg:col-start-auto">
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={event => updateQuestion(question.id, { required: event.target.checked })}
                          className="size-4 accent-pink-600"
                        />
                        Bắt buộc
                      </label>
                      <div className="flex items-center gap-1 sm:col-start-2 lg:col-start-auto">
                        <button
                          type="button"
                          onClick={() => moveQuestion(question.id, -1)}
                          disabled={index === 0}
                          className="flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Đưa câu hỏi lên trên"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveQuestion(question.id, 1)}
                          disabled={index === form.questions.length - 1}
                          className="flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Đưa câu hỏi xuống dưới"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeQuestion(question.id)}
                          className="flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                          aria-label="Xóa câu hỏi"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-white px-4 py-5 text-center text-sm font-semibold text-muted-foreground">
                    Chưa có câu hỏi sàng lọc cho job này.
                  </div>
                )}
                <button
                  type="button"
                  onClick={addQuestion}
                  disabled={form.questions.length >= MAX.questions}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-white text-sm font-bold text-primary transition-colors hover:border-primary/40 hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus size={15} /> Thêm câu hỏi
                </button>
              </div>
            </FormField>
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
