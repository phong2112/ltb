import { Injectable, Logger, Optional } from "@nestjs/common";
import { ChatConversationMode, ChatConversationStatus, ChatSenderType, JobStatus, type ChatMessage } from "@prisma/client";
import type { ChatReplyResult, ChatReplyTurn, GenerateChatReplyInput } from "@/models/ai";
import { AiModelPortalService } from "@/modules/ai/portal/index.service";
import { QuotaExceededError } from "@/modules/ai/providers/groq";
import { PrismaService } from "@/modules/prisma";
import { botReplyClientMessageId, CHAT_BOT_HISTORY_LIMIT, chatAiRetryWaitMs } from "../constants";
import { ChatRealtimePublisher } from "../realtime/publisher.service";
import { ChatKnowledgeService } from "../service/knowledge.service";
import type { ChatBotContext, ChatBotJob, ChatBotReply, ChatBotTurn } from "./context";
import { composeFaqAnswer, findFaqByQuestion, resolveFaqIds } from "./faq";
import { detectJobListing, formatJobListing, hasExactJobMatches, mentionsFaqTopic } from "./job-listing";
import { answerFromKeywords, findMatchingKnowledge } from "./keyword-responder";
import { buildChatBotSystemPrompt, CHAT_BOT_FALLBACK_REPLIES, CHAT_BOT_PROMPT_VERSION } from "./prompt";
import { htmlToPlainText, isHandoffRequest } from "./text";

// The job list and counts shown to guests must cover every open job; the prompt itself is capped separately.
const MAX_JOBS_FOR_BOT = 200;

type ReplySource = "ai" | "ai_faq" | "ai_error" | "faq" | "job_list" | "keyword" | "handoff_rule";
type BotReplyOutcome = ChatBotReply & { source: ReplySource };
type RecentMessage = { id: string; senderType: ChatSenderType; content: string; clientMessageId: string };
type SavedReply = {
  message: ChatMessage;
  conversation: { guestDeviceId: string; status: ChatConversationStatus; mode: ChatConversationMode; handoffRequestedAt: Date | null };
};

@Injectable()
export class ChatBotService {
  private readonly logger = new Logger(ChatBotService.name);
  private readonly running = new Set<string>();
  private readonly rerunRequested = new Set<string>();
  /** Overridable in tests so retry waits do not slow the suite down. */
  private readonly wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiModelPortalService,
    private readonly knowledge: ChatKnowledgeService,
    @Optional() private readonly realtime?: ChatRealtimePublisher,
  ) {}

  /**
   * Replies run after the guest request returns. Within one instance, replies for a
   * conversation are serialized; a message arriving mid-reply triggers one more pass.
   */
  scheduleReply(conversationId: string) {
    if (this.running.has(conversationId)) {
      this.rerunRequested.add(conversationId);
      return;
    }

    this.running.add(conversationId);
    void this.replyUntilSettled(conversationId)
      .catch((error: unknown) => {
        this.logger.error(`chat_bot_reply_failed conversation=${conversationId} error=${describeError(error)}`);
      })
      .finally(() => {
        this.running.delete(conversationId);
        this.rerunRequested.delete(conversationId);
      });
  }

  private async replyUntilSettled(conversationId: string) {
    do {
      this.rerunRequested.delete(conversationId);
      await this.replyTo(conversationId);
    } while (this.rerunRequested.has(conversationId));
  }

  async replyTo(conversationId: string) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        mode: true,
        status: true,
        messages: {
          where: { senderType: { not: ChatSenderType.SYSTEM } },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: CHAT_BOT_HISTORY_LIMIT,
          select: { id: true, senderType: true, content: true, clientMessageId: true },
        },
      },
    });

    if (!conversation || conversation.mode !== ChatConversationMode.BOT || conversation.status !== ChatConversationStatus.OPEN) {
      return false;
    }

    const recent = [...conversation.messages].reverse();
    const pending = findPendingGuestMessage(recent);
    if (!pending) return false;

    const reply = await this.composeReply(conversationId, recent, pending);
    return this.saveReplyIfBotActive(conversationId, pending.id, reply);
  }

  private async composeReply(conversationId: string, recent: RecentMessage[], pending: RecentMessage): Promise<BotReplyOutcome> {
    const history = recent.slice(0, recent.indexOf(pending) + 1).map(toBotTurn);
    if (isHandoffRequest(pending.content)) {
      return { content: CHAT_BOT_FALLBACK_REPLIES.handoffRequested, handoff: true, source: "handoff_rule" };
    }

    const context: ChatBotContext = { history, ...(await this.loadKnowledgeContext()) };
    const exactFaq = findFaqByQuestion(pending.content, context.knowledge);
    if (exactFaq) return { content: composeFaqAnswer([exactFaq]), handoff: false, source: "faq" };
    const listing = detectJobListing(pending.content);
    if (listing && hasExactJobMatches(context.jobs, listing.filters)) {
      return { content: formatJobListing(context.jobs, listing.filters), handoff: false, source: "job_list" };
    }
    if (!this.ai.chatEnabled) return { ...answerFromKeywords(context), source: "keyword" };

    try {
      const result = await this.generateWithQuotaRetry(conversationId, {
        systemPrompt: buildChatBotSystemPrompt(context),
        turns: history.map(toReplyTurn),
      });
      // A job-listing question is never a FAQ, even if the model maps "vị trí đang tuyển" to the salary entry.
      const faqEntries = listing ? [] : resolveFaqIds(result.faqIds, context.knowledge);
      if (faqEntries.length > 0) return { content: composeFaqAnswer(faqEntries), handoff: false, source: "ai_faq" };
      // The model sometimes answers a FAQ topic in its own words (e.g. only the HCM address); send the full approved text instead.
      const missedFaq = !listing && mentionsFaqTopic(pending.content) ? findMatchingKnowledge(context, pending.content) : null;
      if (missedFaq) return { content: composeFaqAnswer([missedFaq]), handoff: false, source: "ai_faq" };
      if (!result.reply) return { ...answerFromKeywords(context), source: "keyword" };
      return { content: result.reply, handoff: result.handoff, source: "ai" };
    } catch (error) {
      // Quota or provider errors fall back to the offline responder so greetings and FAQs still get an answer.
      this.logger.warn(`chat_bot_ai_failed conversation=${conversationId} error=${describeError(error)}`);
      return { ...answerFromKeywords(context), source: "ai_error" };
    }
  }

  /**
   * Free-tier Groq limits reset within seconds, so a short wait usually beats the offline answer.
   * Long waits (e.g. a daily limit) and non-quota errors fall back immediately.
   */
  private async generateWithQuotaRetry(conversationId: string, input: GenerateChatReplyInput): Promise<ChatReplyResult> {
    const startedAt = Date.now();
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.ai.generateChatReply(input);
      } catch (error) {
        const waitMs = error instanceof QuotaExceededError
          ? chatAiRetryWaitMs({ retryAfterMs: error.retryAfterMs, attempt, elapsedMs: Date.now() - startedAt })
          : null;
        if (waitMs === null) throw error;
        this.logger.warn(`chat_bot_ai_quota_retry conversation=${conversationId} attempt=${attempt} waitMs=${waitMs}`);
        await this.wait(waitMs);
      }
    }
  }

  private async loadKnowledgeContext(): Promise<Pick<ChatBotContext, "knowledge" | "jobs">> {
    const [knowledge, jobs] = await Promise.all([
      this.knowledge.listActive(),
      this.prisma.job.findMany({
        where: { status: JobStatus.PUBLISHED },
        orderBy: { createdAt: "desc" },
        take: MAX_JOBS_FOR_BOT,
        select: {
          id: true, title: true, company: true, locations: true, employment: true, level: true,
          salaryRange: true, description: true, requirements: true, benefits: true,
        },
      }),
    ]);
    return { knowledge, jobs: jobs.map(toPlainTextJob) };
  }

  /**
   * TA may join while the AI call is in flight. The conditional update takes the row lock,
   * so the reply is stored only if the conversation is still in BOT mode at write time.
   */
  private async saveReplyIfBotActive(conversationId: string, guestMessageId: string, reply: BotReplyOutcome) {
    const saved = await this.prisma.$transaction(async tx => {
      const now = new Date();
      const updated = await tx.chatConversation.updateMany({
        where: { id: conversationId, mode: ChatConversationMode.BOT, status: ChatConversationStatus.OPEN },
        data: { lastMessageAt: now, ...(reply.handoff ? { handoffRequestedAt: now } : {}) },
      });
      if (updated.count === 0) return null;

      const message = await tx.chatMessage.upsert({
        where: { conversationId_clientMessageId: { conversationId, clientMessageId: botReplyClientMessageId(guestMessageId) } },
        update: {},
        create: {
          conversationId,
          senderType: ChatSenderType.BOT,
          content: reply.content,
          clientMessageId: botReplyClientMessageId(guestMessageId),
          createdAt: now,
        },
      });
      const conversation = await tx.chatConversation.findUniqueOrThrow({
        where: { id: conversationId },
        select: { guestDeviceId: true, status: true, mode: true, handoffRequestedAt: true },
      });
      return { message, conversation };
    });

    if (!saved) return false;

    this.logger.log(
      `chat_bot_replied conversation=${conversationId} source=${reply.source} handoff=${reply.handoff} promptVersion=${CHAT_BOT_PROMPT_VERSION}`,
    );
    this.publish(conversationId, saved);
    return true;
  }

  private publish(conversationId: string, saved: SavedReply) {
    try {
      this.realtime?.messageCreated(saved.conversation.guestDeviceId, saved.message);
      this.realtime?.conversationUpdated({
        guestDeviceId: saved.conversation.guestDeviceId,
        conversationId,
        status: saved.conversation.status,
        mode: saved.conversation.mode,
        handoffRequestedAt: saved.conversation.handoffRequestedAt,
        lastMessageAt: saved.message.createdAt,
        eventId: `conversation:${conversationId}:${saved.message.id}`,
      });
    } catch {
      this.logger.warn("chat_realtime_publish_failed");
    }
  }
}

/**
 * The newest guest message that has no bot reply yet and that TA has not answered.
 * Bot replies can land after a later guest message, so "last message is from the guest" is not enough.
 */
export function findPendingGuestMessage(recent: RecentMessage[]) {
  const latestGuestIndex = recent.map(message => message.senderType).lastIndexOf(ChatSenderType.GUEST);
  if (latestGuestIndex === -1) return null;

  const latestGuest = recent[latestGuestIndex];
  const answeredByTa = recent.slice(latestGuestIndex + 1).some(message => message.senderType === ChatSenderType.TA);
  const answeredByBot = recent.some(message => message.clientMessageId === botReplyClientMessageId(latestGuest.id));
  return answeredByTa || answeredByBot ? null : latestGuest;
}

function toPlainTextJob(job: ChatBotJob): ChatBotJob {
  return {
    ...job,
    description: htmlToPlainText(job.description),
    requirements: htmlToPlainText(job.requirements),
    benefits: job.benefits ? htmlToPlainText(job.benefits) : null,
  };
}

function toBotTurn(message: RecentMessage): ChatBotTurn {
  const sender = message.senderType === ChatSenderType.GUEST ? "GUEST" : message.senderType === ChatSenderType.TA ? "TA" : "BOT";
  return { sender, content: message.content };
}

function toReplyTurn(turn: ChatBotTurn): ChatReplyTurn {
  if (turn.sender === "GUEST") return { role: "guest", content: turn.content };
  if (turn.sender === "TA") return { role: "assistant", content: `[TA]: ${turn.content}` };
  return { role: "assistant", content: turn.content };
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
