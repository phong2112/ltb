import { composeFaqAnswer } from "./faq";
import { CHAT_BOT_FALLBACK_REPLIES } from "./prompt";
import { type ChatBotContext, type ChatBotJob, type ChatBotReply, jobPath } from "./context";
import { buildQuery, matchedTermShare, pickBest, scoreJob, scoreKnowledge, withoutCommonTitleTerms } from "./relevance";
import { detectSmallTalk, normalizeForMatching, type SmallTalk, truncateText } from "./text";

const JOB_LISTING_TERMS = new Set([
  "job", "jobs", "viec", "tuyen", "dung", "vi", "tri", "position", "positions", "opening", "openings", "role", "roles",
]);

const MIN_KNOWLEDGE_SCORE = 2;
const MIN_KNOWLEDGE_TERM_SHARE = 0.4;
// A job must match on its title or headline (weighted ×3), not only on description words.
const MIN_JOB_SCORE = 3;
const MAX_LISTED_JOBS = 6;

const SMALL_TALK_REPLIES: Record<SmallTalk, string> = {
  greeting: "Chào bạn! Mình là trợ lý tuyển dụng. Bạn muốn tìm hiểu về vị trí đang tuyển, quy trình phỏng vấn hay chế độ làm việc ạ?",
  thanks: "Không có gì ạ! Nếu cần thêm thông tin, bạn cứ nhắn mình nhé.",
  goodbye: "Cảm ơn bạn đã quan tâm. Chúc bạn một ngày tốt lành và hẹn gặp lại!",
};

/** Offline responder used when chat AI is disabled or unavailable. It only quotes stored knowledge and job data. */
export function answerFromKeywords(context: ChatBotContext): ChatBotReply {
  const question = [...context.history].reverse().find(turn => turn.sender === "GUEST")?.content ?? "";
  const query = buildQuery(question);
  const smallTalk = detectSmallTalk(question);
  if (query.terms.length === 0) return smallTalkOrUnknown(smallTalk);

  const bestKnowledge = pickBest(context.knowledge, entry => scoreKnowledge(query, entry));
  const jobQuery = withoutCommonTitleTerms(query, context.jobs);
  const bestJob = pickBest(context.jobs, job => scoreJob(jobQuery, job));

  const knowledgeMatches = bestKnowledge !== null
    && bestKnowledge.score >= MIN_KNOWLEDGE_SCORE
    && matchedTermShare(query, `${bestKnowledge.item.title} ${bestKnowledge.item.content}`) >= MIN_KNOWLEDGE_TERM_SHARE;
  if (bestKnowledge && knowledgeMatches && bestKnowledge.score >= (bestJob?.score ?? 0)) {
    return { content: composeFaqAnswer([bestKnowledge.item]), handoff: false };
  }
  if (bestJob && bestJob.score >= MIN_JOB_SCORE) {
    return { content: formatJob(bestJob.item), handoff: false };
  }
  if (query.terms.some(term => JOB_LISTING_TERMS.has(normalizeForMatching(term))) && context.jobs.length > 0) {
    return { content: formatJobList(context.jobs), handoff: false };
  }
  return smallTalkOrUnknown(smallTalk);
}

function smallTalkOrUnknown(smallTalk: SmallTalk | null): ChatBotReply {
  return smallTalk
    ? { content: SMALL_TALK_REPLIES[smallTalk], handoff: false }
    : { content: CHAT_BOT_FALLBACK_REPLIES.unknown, handoff: true };
}

function formatJob(job: ChatBotJob) {
  return [
    `${job.title}${job.locations.length ? ` – ${job.locations.join(", ")}` : ""}`,
    [job.employment, job.level].filter(Boolean).join(" · ") || null,
    job.salaryRange ? `Mức lương: ${job.salaryRange}` : null,
    job.requirements ? `Yêu cầu chính: ${truncateText(job.requirements.replace(/\n/g, " "), 220)}` : null,
    `Xem chi tiết: ${jobPath(job)} · Ứng tuyển: ${jobPath(job)}/apply`,
  ].filter((line): line is string => line !== null).join("\n");
}

function formatJobList(jobs: ChatBotJob[]) {
  const lines = jobs
    .slice(0, MAX_LISTED_JOBS)
    .map(job => `- ${job.title}${job.locations.length ? ` (${job.locations.join(", ")})` : ""}: ${jobPath(job)}`);
  const more = jobs.length > MAX_LISTED_JOBS ? `\nXem tất cả ${jobs.length} vị trí tại /jobs` : "";
  return `Các vị trí đang tuyển:\n${lines.join("\n")}${more}`;
}
