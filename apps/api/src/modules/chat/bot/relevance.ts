import type { ChatBotJob, ChatBotKnowledge } from "./context";
import { hasVietnameseDiacritics, normalizeForMatching, tokenizeKeepingDiacritics } from "./text";

const STOP_WORDS = new Set([
  "a", "ah", "oi", "nhe", "nha", "la", "cua", "va", "co", "khong", "ko", "cho", "toi", "minh", "em", "anh",
  "ban", "nao", "gi", "the", "nhu", "ve", "duoc", "voi", "o", "thi", "nay", "do", "vay", "sao", "mot", "cac",
  "nhung", "hoi", "muon", "biet", "xin", "can", "de", "hay", "hien", "tai", "dang", "se", "da", "chi", "con", "is",
  // Greetings and thanks often share a message with the real question.
  "chao", "hello", "hi", "alo", "cam", "on", "thanks", "thank",
  // Question words ("bao nhiêu") carry no topic: "giá vàng bao nhiêu" must not match the salary FAQ.
  "bao", "nhieu",
  // Generic recruiting words appear in every question and in FAQ titles ("vị trí đang tuyển").
  "vi", "tri", "tuyen", "dung",
  "what", "how", "are", "you", "i", "an", "of", "to", "for", "and", "in", "on", "about", "please",
]);

// Syllables collide once diacritics are removed ("văn phòng" vs "phỏng vấn"), so
// adjacent-syllable pairs weigh more than single syllables.
const BIGRAM_WEIGHT = 3;
const JOB_HEADLINE_WEIGHT = 3;
// Long job descriptions match almost any question; cap their contribution so FAQs and job titles win.
const JOB_BODY_SCORE_CAP = 2;
const KNOWLEDGE_TITLE_WEIGHT = 2;
// Title words shared by many jobs ("chuyên viên", "engineer") identify none of them.
const COMMON_TITLE_TERM_SHARE = 0.15;
const COMMON_TITLE_TERM_MIN_JOBS = 3;

/**
 * Removing diacritics merges different words ("phỏng vấn" and "vận hành" both contain "van"),
 * so a question typed with diacritics is matched with diacritics; unaccented questions fall back to stripping them.
 */
export type MatchQuery = { terms: string[]; bigrams: string[]; keepDiacritics: boolean };

export function buildQuery(text: string): MatchQuery {
  const keepDiacritics = hasVietnameseDiacritics(text);
  const words = tokenize(text, keepDiacritics);
  const terms = [...new Set(words)].filter(term => term.length >= 2 && !STOP_WORDS.has(normalizeForMatching(term)));
  return { terms, bigrams: bigramsOf(words), keepDiacritics };
}

export function scoreKnowledge(query: MatchQuery, entry: ChatBotKnowledge) {
  return scoreText(query, entry.title) * KNOWLEDGE_TITLE_WEIGHT + scoreText(query, entry.content);
}

/** Share of the question's meaningful words found in the text; separates "lương?" from "thời tiết hôm nay". */
export function matchedTermShare(query: MatchQuery, text: string) {
  if (query.terms.length === 0) return 0;
  const words = new Set(tokenize(text, query.keepDiacritics));
  return query.terms.filter(term => words.has(term)).length / query.terms.length;
}

/** Job names ("Data Analyst") never appear in FAQ answers, so they should not count against a FAQ match. */
export function withoutTitleTerms(query: MatchQuery, title: string | undefined): MatchQuery {
  if (!title) return query;
  const titleWords = new Set(tokenize(title, query.keepDiacritics));
  return { ...query, terms: query.terms.filter(term => !titleWords.has(term)) };
}

/** Drops query words that appear in many job titles, so "ứng viên" does not match every "Chuyên viên …" job. */
export function withoutCommonTitleTerms(query: MatchQuery, jobs: ChatBotJob[]): MatchQuery {
  const titleTokens = jobs.map(job => tokenize(job.title, query.keepDiacritics));
  const limit = Math.max(COMMON_TITLE_TERM_MIN_JOBS, Math.ceil(jobs.length * COMMON_TITLE_TERM_SHARE));
  const isCommon = (term: string, tokensOf: (tokens: string[]) => string[]) =>
    titleTokens.filter(tokens => tokensOf(tokens).includes(term)).length > limit;
  return {
    ...query,
    terms: query.terms.filter(term => !isCommon(term, tokens => tokens)),
    bigrams: query.bigrams.filter(bigram => !isCommon(bigram, bigramsOf)),
  };
}

/** Only the title identifies a job: company and locations are shared by many jobs and would match them all. */
export function scoreJob(query: MatchQuery, job: ChatBotJob) {
  const body = [job.description, job.requirements, job.benefits].filter(Boolean).join(" ");
  return scoreText(query, job.title) * JOB_HEADLINE_WEIGHT + Math.min(scoreText(query, body), JOB_BODY_SCORE_CAP);
}

/** Jobs most related to the latest question, using recent turns for follow-ups such as "lương vị trí đó?". */
export function rankRelevantJobs(jobs: ChatBotJob[], input: { latestQuestion: string; recentText: string; limit: number }) {
  const latest = withoutCommonTitleTerms(buildQuery(input.latestQuestion), jobs);
  const recent = withoutCommonTitleTerms(buildQuery(input.recentText), jobs);
  return jobs
    .map(job => ({ job, score: scoreJob(latest, job) * 2 + scoreJob(recent, job) }))
    .filter(ranked => ranked.score > JOB_BODY_SCORE_CAP * 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit)
    .map(ranked => ranked.job);
}

export function pickBest<T>(items: T[], score: (item: T) => number) {
  let best: { item: T; score: number } | null = null;
  for (const item of items) {
    const value = score(item);
    if (!best || value > best.score) best = { item, score: value };
  }
  return best;
}

function tokenize(text: string, keepDiacritics: boolean) {
  return (keepDiacritics ? tokenizeKeepingDiacritics(text) : normalizeForMatching(text)).split(" ").filter(Boolean);
}

function bigramsOf(words: string[]) {
  return words.slice(1).map((word, index) => `${words[index]} ${word}`);
}

function scoreText(query: MatchQuery, text: string) {
  const tokens = tokenize(text, query.keepDiacritics);
  const words = new Set(tokens);
  const pairs = new Set(bigramsOf(tokens));
  const termHits = query.terms.filter(term => words.has(term)).length;
  const bigramHits = query.bigrams.filter(bigram => pairs.has(bigram)).length;
  return termHits + bigramHits * BIGRAM_WEIGHT;
}
