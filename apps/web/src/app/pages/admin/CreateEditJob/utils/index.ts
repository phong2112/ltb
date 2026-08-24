import type { Job } from "@/app/data";
import { getMeaningfulRichTextLength as getMeaningfulTextLength } from "@/app/utils/helpers/rich-text";
import {
  JOB_LEVELS,
  JOB_LOCATIONS,
  JOB_TYPES,
  MAX,
  MAX_SALARY_DISPLAY,
  MAX_SALARY_VALUE,
  SALARY_CURRENCIES,
  TAG_PATTERN,
  TEXT_PATTERN,
} from "@/app/pages/admin/CreateEditJob/constants";
import type { FormErrors, JobForm, SalaryCurrency } from "@/app/pages/admin/CreateEditJob/types";

/** Splits a saved salary string into editable amount and currency fields. */
export function parseSalary(value: string): { amount: string; currency: SalaryCurrency } {
  const trimmed = value.trim();
  const currencyMatch = trimmed.match(/\b(VND|USD)\s*$/i);
  const currency = currencyMatch ? currencyMatch[1].toUpperCase() as SalaryCurrency : "VND";
  const amount = currencyMatch ? trimmed.slice(0, currencyMatch.index).trim() : trimmed;

  return {
    amount: formatSalaryAmount(amount),
    currency,
  };
}

/** Joins editable salary fields into the persisted display string. */
export function buildSalary(amount: string, currency: SalaryCurrency) {
  return amount.trim() ? `${amount.trim()} ${currency}` : "";
}

/** Keeps salary input readable while preserving support for min-max ranges. */
export function formatSalaryAmount(value: string) {
  const normalized = value.replace(/[–—]/g, "-");
  const separatorIndex = normalized.indexOf("-");

  if (separatorIndex >= 0) {
    const min = normalized.slice(0, separatorIndex);
    const max = normalized.slice(separatorIndex + 1);
    const formattedMin = formatNumberString(min);
    const formattedMax = formatNumberString(max);

    if (!formattedMin) return formattedMax;
    return formattedMax ? `${formattedMin} - ${formattedMax}` : `${formattedMin} - `;
  }

  return formatNumberString(normalized);
}

/** Formats a digits-only string with thousand separators. */
function formatNumberString(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Counts salary edit tokens so caret position survives formatting commas. */
export function countSalaryTokens(value: string) {
  return [...value].filter(character => /\d|-/.test(character)).length;
}

/** Restores the caret near the same logical salary token after reformatting. */
export function findSalaryCaret(value: string, tokenOffset: number) {
  if (tokenOffset <= 0) return 0;

  let tokensSeen = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (/\d|-/.test(value[index])) tokensSeen += 1;
    if (tokensSeen === tokenOffset) return index + 1;
  }

  return value.length;
}

/** Trims, deduplicates, and preserves the first spelling of each skill tag. */
export function cleanTagList(values: string[]) {
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

/** Parses a formatted salary amount back to a number for range validation. */
function parseSalaryNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

/** Validates salary format, max value, and min-max ordering. */
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

/** Validates the full job editor form before create/update requests. */
export function validateJobForm(job: JobForm, tags: string[]) {
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

  if (!JOB_TYPES.includes(job.type as typeof JOB_TYPES[number])) nextErrors.type = "Hình thức làm việc không hợp lệ";
  if (!JOB_LEVELS.includes(job.level as typeof JOB_LEVELS[number])) nextErrors.level = "Cấp bậc không hợp lệ";

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

/** Validates one skill tag before adding it to the job form. */
export function getTagError(tag: string, currentTags: string[]) {
  if (currentTags.length >= 12) return "Tối đa 12 tags kỹ năng";
  if (tag.length < 2) return "Tag cần ít nhất 2 ký tự";
  if (tag.length > 30) return "Mỗi tag tối đa 30 ký tự";
  if (!TAG_PATTERN.test(tag)) return "Tag không chứa ký tự đặc biệt lạ";
  if ([...currentTags, tag].join(", ").length > MAX.tags) return `Tags tối đa ${MAX.tags} ký tự`;
  return "";
}

/** Creates a client-only ID for unsaved screening questions before the API assigns one. */
export function createLocalQuestionId() {
  return `local-question-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Rewrites question sortOrder to match the current drag/drop or visual order. */
export function orderQuestions(questions: Job["questions"]) {
  return questions.map((question, index) => ({
    ...question,
    sortOrder: index,
  }));
}

/** Narrows arbitrary select values to the supported salary currency union. */
export function isSalaryCurrency(value: string): value is SalaryCurrency {
  return SALARY_CURRENCIES.includes(value as SalaryCurrency);
}
