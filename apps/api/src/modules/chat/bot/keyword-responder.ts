import { CHAT_BOT_FALLBACK_REPLIES } from "./prompt";
import { type ChatBotContext, type ChatBotJob, type ChatBotKnowledge, type ChatBotReply, jobPath } from "./context";
import { normalizeForMatching, truncateText } from "./text";

const STOP_WORDS = new Set([
  "a", "ah", "oi", "nhe", "nha", "la", "cua", "va", "co", "khong", "ko", "cho", "toi", "minh", "em", "anh",
  "ban", "nao", "gi", "the", "nhu", "ve", "duoc", "voi", "o", "thi", "nay", "do", "vay", "sao", "mot", "cac",
  "nhung", "hoi", "muon", "biet", "xin", "can", "de", "hay", "hien", "tai", "dang", "se", "da", "chi", "is",
  "what", "how", "are", "you", "i", "an", "of", "to", "for", "and", "in", "on", "about", "please",
]);

const JOB_LISTING_TERMS = new Set([
  "job", "jobs", "viec", "tuyen", "dung", "vi", "tri", "position", "positions", "opening", "openings", "role", "roles",
]);

const MIN_MATCH_SCORE = 2;
// Syllables collide once diacritics are removed ("văn phòng" vs "phỏng vấn"), so
// adjacent-syllable pairs weigh more than single syllables.
const BIGRAM_WEIGHT = 3;
const MAX_LISTED_JOBS = 6;

type Query = { terms: string[]; bigrams: string[] };

/** Offline responder used when chat AI is disabled. It only quotes stored knowledge and job data. */
export function answerFromKeywords(context: ChatBotContext): ChatBotReply {
  const question = [...context.history].reverse().find(turn => turn.sender === "GUEST")?.content ?? "";
  const query: Query = { terms: significantTerms(question), bigrams: bigramsOf(question) };
  if (query.terms.length === 0) return { content: CHAT_BOT_FALLBACK_REPLIES.unknown, handoff: true };

  const bestKnowledge = pickBest(context.knowledge, entry => scoreText(query, `${entry.title} ${entry.content}`));
  const bestJob = pickBest(context.jobs, job => scoreText(query, jobSearchText(job)));

  if (bestKnowledge && bestKnowledge.score >= MIN_MATCH_SCORE && bestKnowledge.score >= (bestJob?.score ?? 0)) {
    return { content: formatKnowledge(bestKnowledge.item), handoff: false };
  }
  if (bestJob && bestJob.score >= MIN_MATCH_SCORE) {
    return { content: formatJob(bestJob.item), handoff: false };
  }
  if (query.terms.some(term => JOB_LISTING_TERMS.has(term)) && context.jobs.length > 0) {
    return { content: formatJobList(context.jobs), handoff: false };
  }
  return { content: CHAT_BOT_FALLBACK_REPLIES.unknown, handoff: true };
}

function significantTerms(input: string) {
  return [...new Set(normalizeForMatching(input).split(" "))].filter(term => term.length >= 2 && !STOP_WORDS.has(term));
}

function bigramsOf(input: string) {
  const words = normalizeForMatching(input).split(" ").filter(Boolean);
  return words.slice(1).map((word, index) => `${words[index]} ${word}`);
}

function scoreText(query: Query, text: string) {
  const words = new Set(normalizeForMatching(text).split(" "));
  const pairs = new Set(bigramsOf(text));
  const termHits = query.terms.filter(term => words.has(term)).length;
  const bigramHits = query.bigrams.filter(bigram => pairs.has(bigram)).length;
  return termHits + bigramHits * BIGRAM_WEIGHT;
}

function pickBest<T>(items: T[], score: (item: T) => number) {
  let best: { item: T; score: number } | null = null;
  for (const item of items) {
    const value = score(item);
    if (!best || value > best.score) best = { item, score: value };
  }
  return best;
}

function jobSearchText(job: ChatBotJob) {
  return [job.title, job.company, ...job.locations, job.employment, job.level, job.salaryRange, job.description, job.requirements, job.benefits]
    .filter(Boolean)
    .join(" ");
}

function formatKnowledge(entry: ChatBotKnowledge) {
  return `${entry.title}\n${truncateText(entry.content, 1_200)}`;
}

function formatJob(job: ChatBotJob) {
  return [
    `${job.title}${job.locations.length ? ` - ${job.locations.join(", ")}` : ""}`,
    job.employment ? `- Hình thức: ${job.employment}` : null,
    job.salaryRange ? `- Mức lương: ${job.salaryRange}` : null,
    job.benefits ? `- Phúc lợi: ${truncateText(job.benefits, 300)}` : null,
    `- Yêu cầu: ${truncateText(job.requirements, 300)}`,
    `Chi tiết: ${jobPath(job)} · Ứng tuyển: ${jobPath(job)}/apply`,
  ].filter((line): line is string => line !== null).join("\n");
}

function formatJobList(jobs: ChatBotJob[]) {
  const lines = jobs
    .slice(0, MAX_LISTED_JOBS)
    .map(job => `- ${job.title}${job.locations.length ? ` (${job.locations.join(", ")})` : ""}: ${jobPath(job)}`);
  const more = jobs.length > MAX_LISTED_JOBS ? `\nXem tất cả ${jobs.length} vị trí tại /jobs` : "";
  return `Các vị trí đang tuyển:\n${lines.join("\n")}${more}`;
}
