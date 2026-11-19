import { type ChatBotJob, jobPath } from "./context";
import { normalizeForMatching } from "./text";

// "nào/gì" must follow the job noun directly: "vị trí nào" lists jobs, "vị trí DevOps cần gì" asks about one job.
const LISTING_PATTERNS = [
  /\b(vi tri|job|jobs|viec|viec lam|cong viec|nganh|position|positions|opening|openings|role|roles) (nao|gi)\b/,
  /\btuyen (nhung |cac )?(vi tri |job |viec |nganh )?(nao|gi)\b/,
  /\bdanh sach\b.*\b(viec|job|jobs|vi tri)\b/,
  /\b(what|which|any|open)\b.*\b(jobs?|positions?|openings?|roles?|vacancies)\b/,
  /\bhiring\b/,
];

// Questions about salary, interviews, CV, or working conditions belong to the FAQ even when they mention "vị trí".
const FAQ_TOPIC_PATTERN = /\b(luong|thu nhap|phong van|ket qua|cv|ho so|phan hoi|dia diem|o dau|gio lam|thoi gian|van phong|phuc loi|che do|quy trinh|salary|interview)\b/;

const LISTING_WORDS = new Set([
  "dang", "tuyen", "dung", "nhung", "cac", "vi", "tri", "job", "jobs", "viec", "lam", "cong", "nao", "gi", "co", "con",
  "khong", "ko", "nganh", "position", "positions", "opening", "openings", "role", "roles", "danh", "sach", "hien", "nay",
  "tai", "ben", "minh", "ty", "vsf", "a", "oi", "nhe", "vay", "the", "o", "cho", "em", "anh", "chi", "ban", "hoi", "xin",
  "what", "which", "any", "open", "are", "there", "is", "do", "you", "have", "hiring", "now", "currently", "vacancies", "in",
  "chao", "hello", "hi", "kiem", "tra", "sau", "deploy", "muon", "biet", "duoc", "khac", "mot", "so", "can",
]);

// Place names become one token so their syllables ("chí", "minh") are not mistaken for pronouns ("chị", "mình").
const LOCATION_ALIASES: [RegExp, string][] = [
  [/\b(tp )?(ho chi minh|hcm|sai gon|sg)\b/g, "hcm"],
  [/\b(ha noi|hn)\b/g, "hanoi"],
  [/\bda nang\b/g, "danang"],
  [/\bhai phong\b/g, "haiphong"],
  [/\bquang ninh\b/g, "quangninh"],
];

const MAX_LISTED_JOBS = 10;

export type JobListingRequest = { filters: string[] };

export function mentionsFaqTopic(question: string) {
  return FAQ_TOPIC_PATTERN.test(normalizeForMatching(question));
}

/** A request for the list of open jobs, with any extra words treated as filters (location, field…). */
export function detectJobListing(question: string): JobListingRequest | null {
  // "thế nào" means "how", not "which", so it never makes a listing question.
  const text = expandLocations(normalizeForMatching(question)).replace(/\b(nhu )?the nao\b/g, " ").replace(/\s+/g, " ").trim();
  if (!text || FAQ_TOPIC_PATTERN.test(text)) return null;
  if (!LISTING_PATTERNS.some(pattern => pattern.test(text))) return null;
  return { filters: text.split(" ").filter(word => word.length >= 2 && !LISTING_WORDS.has(word)) };
}

/** True when every filter word matches at least one job, so the list can be built without the AI. */
export function hasExactJobMatches(jobs: ChatBotJob[], filters: string[]) {
  return filters.length === 0 || filterJobs(jobs, filters, { requireAll: true }).length > 0;
}

export function filterJobs(jobs: ChatBotJob[], filters: string[], options: { requireAll?: boolean } = {}) {
  if (filters.length === 0) return jobs;
  const searchable = jobs.map(job => ({ job, words: new Set(expandLocations(normalizeForMatching([job.title, ...job.locations, job.level].filter(Boolean).join(" "))).split(" ")) }));
  const matchingAll = searchable.filter(({ words }) => filters.every(filter => words.has(filter)));
  if (matchingAll.length > 0 || options.requireAll) return matchingAll.map(({ job }) => job);
  return searchable.filter(({ words }) => filters.some(filter => words.has(filter))).map(({ job }) => job);
}

/** Built from the job table, so the list is always current and never invented. */
export function formatJobListing(allJobs: ChatBotJob[], filters: string[] = []) {
  if (allJobs.length === 0) return "Hiện chưa có vị trí nào đang mở tuyển. Bạn có thể quay lại sau hoặc để lại câu hỏi, TA sẽ liên hệ khi có vị trí phù hợp.";

  const matches = filterJobs(allJobs, filters);
  const filtered = filters.length > 0 && matches.length > 0;
  const jobs = filtered ? matches : allJobs;
  const intro = filters.length > 0 && !filtered
    ? `Mình chưa thấy vị trí khớp đúng yêu cầu. Hiện đang tuyển ${allJobs.length} vị trí, ví dụ:`
    : filtered
      ? `Có ${jobs.length} vị trí phù hợp:`
      : `Hiện đang tuyển ${jobs.length} vị trí${jobs.length > MAX_LISTED_JOBS ? ", một số vị trí mới nhất:" : ":"}`;
  const lines = jobs
    .slice(0, MAX_LISTED_JOBS)
    .map(job => `- ${job.title}${job.locations.length ? ` (${job.locations.join(", ")})` : ""}: ${jobPath(job)}`);
  const more = jobs.length > MAX_LISTED_JOBS ? `\nXem tất cả tại /jobs` : "";
  return `${intro}\n${lines.join("\n")}${more}\nBạn cho mình biết kinh nghiệm hoặc kỹ năng để mình gợi ý vị trí phù hợp nhé.`;
}

function expandLocations(text: string) {
  return LOCATION_ALIASES.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text);
}
