import { Logger } from "@nestjs/common";
import { ChatConversationMode, ChatConversationStatus, ChatSenderType } from "@prisma/client";
import type { AiModelPortalService } from "@/modules/ai/portal/index.service";
import { QuotaExceededError } from "@/modules/ai/providers/groq";
import type { PrismaService } from "@/modules/prisma";
import { botReplyClientMessageId } from "../constants";
import type { ChatRealtimePublisher } from "../realtime/publisher.service";
import type { ChatKnowledgeService } from "../service/knowledge.service";
import { CHAT_BOT_FALLBACK_REPLIES } from "./prompt";
import { ChatBotService, findPendingGuestMessage } from "./reply.service";
import { VSF_FAQ } from "./vsf-faq.fixture";

type Message = { id: string; senderType: ChatSenderType; content: string; clientMessageId?: string };

function setup(options: {
  mode?: ChatConversationMode;
  status?: ChatConversationStatus;
  messagesNewestFirst?: Message[];
  question?: string;
  updateCount?: number;
  chatEnabled?: boolean;
  generateChatReply?: jest.Mock;
} = {}) {
  const createdMessage = { id: "bot-1", conversationId: "c1", createdAt: new Date() };
  const tx = {
    chatConversation: {
      updateMany: jest.fn().mockResolvedValue({ count: options.updateCount ?? 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        guestDeviceId: "device-1",
        status: ChatConversationStatus.OPEN,
        mode: ChatConversationMode.BOT,
        handoffRequestedAt: null,
      }),
    },
    chatMessage: { upsert: jest.fn().mockResolvedValue(createdMessage) },
  };
  const prisma = {
    chatConversation: {
      findUnique: jest.fn().mockResolvedValue({
        id: "c1",
        mode: options.mode ?? ChatConversationMode.BOT,
        status: options.status ?? ChatConversationStatus.OPEN,
        messages: options.messagesNewestFirst ?? [{ id: "g1", senderType: ChatSenderType.GUEST, content: options.question ?? "Vị trí Data Analyst cần kỹ năng gì?" }],
      }),
    },
    job: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)),
  };
  const ai = {
    chatEnabled: options.chatEnabled ?? true,
    generateChatReply: options.generateChatReply ?? jest.fn().mockResolvedValue({ reply: "Một vòng online.", handoff: false, faqIds: [] }),
  };
  const knowledge = { listActive: jest.fn().mockResolvedValue([{ id: "faq_interview", category: "FAQ", title: "Phỏng vấn mấy vòng", content: "01 vòng online" }, ...VSF_FAQ]) };
  const realtime = { messageCreated: jest.fn(), conversationUpdated: jest.fn() };
  const service = new ChatBotService(
    prisma as unknown as PrismaService,
    ai as unknown as AiModelPortalService,
    knowledge as unknown as ChatKnowledgeService,
    realtime as unknown as ChatRealtimePublisher,
  );
  const wait = jest.fn().mockResolvedValue(undefined);
  Object.assign(service, { wait });
  return { service, prisma, tx, ai, realtime, wait };
}

describe("ChatBotService.replyTo", () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });

  it("stores the AI reply once per guest message and publishes it", async () => {
    const { service, tx, realtime } = setup();
    await expect(service.replyTo("c1")).resolves.toBe(true);
    expect(tx.chatMessage.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { conversationId_clientMessageId: { conversationId: "c1", clientMessageId: botReplyClientMessageId("g1") } },
      create: expect.objectContaining({ senderType: ChatSenderType.BOT, content: "Một vòng online." }),
    }));
    expect(realtime.messageCreated).toHaveBeenCalledWith("device-1", expect.objectContaining({ id: "bot-1" }));
    expect(realtime.conversationUpdated).toHaveBeenCalledWith(expect.objectContaining({ mode: ChatConversationMode.BOT }));
  });

  it("stays silent while TA handles the conversation", async () => {
    const { service, ai, prisma } = setup({ mode: ChatConversationMode.HUMAN });
    await expect(service.replyTo("c1")).resolves.toBe(false);
    expect(ai.generateChatReply).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("does not answer closed or blocked conversations", async () => {
    const { service, ai } = setup({ status: ChatConversationStatus.BLOCKED });
    await expect(service.replyTo("c1")).resolves.toBe(false);
    expect(ai.generateChatReply).not.toHaveBeenCalled();
  });

  it("does not answer a guest message the bot already answered", async () => {
    const { service, ai } = setup({
      messagesNewestFirst: [
        { id: "b1", senderType: ChatSenderType.BOT, content: "Chào bạn", clientMessageId: botReplyClientMessageId("g1") },
        { id: "g1", senderType: ChatSenderType.GUEST, content: "Hi" },
      ],
    });
    await expect(service.replyTo("c1")).resolves.toBe(false);
    expect(ai.generateChatReply).not.toHaveBeenCalled();
  });

  it("drops the reply when TA joined while the AI was answering", async () => {
    const { service, tx, realtime } = setup({ updateCount: 0 });
    await expect(service.replyTo("c1")).resolves.toBe(false);
    expect(tx.chatMessage.upsert).not.toHaveBeenCalled();
    expect(realtime.messageCreated).not.toHaveBeenCalled();
  });

  it("skips the AI and flags handoff when the guest asks for a human", async () => {
    const { service, ai, tx } = setup({
      messagesNewestFirst: [{ id: "g1", senderType: ChatSenderType.GUEST, content: "Cho mình gặp HR" }],
    });
    await service.replyTo("c1");
    expect(ai.generateChatReply).not.toHaveBeenCalled();
    expect(tx.chatConversation.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ handoffRequestedAt: expect.any(Date) }),
    }));
    expect(tx.chatMessage.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ content: CHAT_BOT_FALLBACK_REPLIES.handoffRequested }),
    }));
  });

  it("answers from the knowledge base without AI when chat AI is disabled", async () => {
    const { service, ai, tx } = setup({ question: "Cho mình hỏi phỏng vấn gồm mấy vòng?", chatEnabled: false });
    await service.replyTo("c1");
    expect(ai.generateChatReply).not.toHaveBeenCalled();
    expect(tx.chatMessage.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ content: expect.stringContaining("01 vòng online") }),
    }));
  });

  it("falls back to the knowledge base when the AI fails, without flagging TA", async () => {
    const { service, tx } = setup({ question: "Cho mình hỏi phỏng vấn gồm mấy vòng?", generateChatReply: jest.fn().mockRejectedValue(new Error("quota exceeded")) });
    await service.replyTo("c1");
    expect(tx.chatMessage.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ content: expect.stringContaining("01 vòng online") }),
    }));
    expect(tx.chatConversation.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.not.objectContaining({ handoffRequestedAt: expect.anything() }),
    }));
  });
});

describe("ChatBotService FAQ answers", () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
  });

  it.each(VSF_FAQ.map(entry => [entry.title, entry.content]))(
    "answers the suggested question %s with the full approved text and no AI call",
    async (question, approvedAnswer) => {
      const { service, ai, tx } = setup({ messagesNewestFirst: [{ id: "g1", senderType: ChatSenderType.GUEST, content: question }] });
      await service.replyTo("c1");
      expect(ai.generateChatReply).not.toHaveBeenCalled();
      expect(tx.chatMessage.upsert.mock.calls[0][0].create.content).toBe(approvedAnswer);
    },
  );

  it("replaces the AI wording with the approved FAQ text when the AI picks FAQ entries", async () => {
    const generateChatReply = jest.fn().mockResolvedValue({
      reply: "Thông thường 1 vòng.",
      handoff: false,
      faqIds: ["faq_vsf_interview_process", "faq_vsf_salary_policy"],
    });
    const { service, tx } = setup({ generateChatReply });
    await service.replyTo("c1");
    const [interview, salary] = VSF_FAQ;
    expect(tx.chatMessage.upsert.mock.calls[0][0].create.content).toBe(`${interview.content}\n\n${salary.content}`);
  });

  it("loads every open job so the job list and its count are complete", async () => {
    const { service, prisma } = setup({ question: "Đang tuyển những vị trí nào?" });
    await service.replyTo("c1");
    expect(prisma.job.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 200 }));
  });

  it("answers the job-list suggestion from the job table without calling the AI", async () => {
    const { service, ai, prisma, tx } = setup({ messagesNewestFirst: [{ id: "g1", senderType: ChatSenderType.GUEST, content: "Đang tuyển những vị trí nào?" }] });
    prisma.job.findMany.mockResolvedValue([{ id: "job-da", title: "Data Analyst", company: "VSF", locations: ["Hà Nội"], employment: null, level: null, salaryRange: null, description: "", requirements: "", benefits: null }]);
    await service.replyTo("c1");
    expect(ai.generateChatReply).not.toHaveBeenCalled();
    expect(tx.chatMessage.upsert.mock.calls[0][0].create.content).toContain("- Data Analyst (Hà Nội): /jobs/job-da");
  });

  it("never turns a filtered job-list question into the salary FAQ", async () => {
    const generateChatReply = jest.fn().mockResolvedValue({ reply: "Các vị trí về blockchain: chưa có.", handoff: false, faqIds: ["faq_vsf_salary_policy"] });
    const { service, tx } = setup({
      generateChatReply,
      messagesNewestFirst: [{ id: "g1", senderType: ChatSenderType.GUEST, content: "Có vị trí nào về blockchain không?" }],
    });
    await service.replyTo("c1");
    expect(generateChatReply).toHaveBeenCalled();
    expect(tx.chatMessage.upsert.mock.calls[0][0].create.content).toBe("Các vị trí về blockchain: chưa có.");
  });

  it("sends the full FAQ when the AI answers a FAQ topic only partially", async () => {
    const generateChatReply = jest.fn().mockResolvedValue({ reply: "Văn phòng HCM ở Vincom Đồng Khởi.", handoff: false, faqIds: [] });
    const { service, tx } = setup({
      generateChatReply,
      messagesNewestFirst: [{ id: "g1", senderType: ChatSenderType.GUEST, content: "Văn phòng HCM ở đâu" }],
    });
    await service.replyTo("c1");
    expect(tx.chatMessage.upsert.mock.calls[0][0].create.content).toBe(VSF_FAQ[2].content);
  });

  it("ignores unknown FAQ ids and keeps the AI reply", async () => {
    const generateChatReply = jest.fn().mockResolvedValue({ reply: "Câu trả lời của AI.", handoff: false, faqIds: ["made_up_id"] });
    const { service, tx } = setup({ generateChatReply });
    await service.replyTo("c1");
    expect(tx.chatMessage.upsert.mock.calls[0][0].create.content).toBe("Câu trả lời của AI.");
  });
});

describe("ChatBotService quota retry", () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });

  it("waits out a short rate limit and still answers with AI", async () => {
    const generateChatReply = jest.fn()
      .mockRejectedValueOnce(new QuotaExceededError(4_000))
      .mockResolvedValueOnce({ reply: "Một vòng online.", handoff: false, faqIds: [] });
    const { service, tx, wait } = setup({ generateChatReply });
    await service.replyTo("c1");
    expect(wait).toHaveBeenCalledWith(4_000);
    expect(generateChatReply).toHaveBeenCalledTimes(2);
    expect(tx.chatMessage.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ content: "Một vòng online." }),
    }));
  });

  it("uses the offline answer right away when the wait is too long", async () => {
    const generateChatReply = jest.fn().mockRejectedValue(new QuotaExceededError(60_000));
    const { service, tx, wait } = setup({ generateChatReply, question: "Cho mình hỏi phỏng vấn gồm mấy vòng?", });
    await service.replyTo("c1");
    expect(wait).not.toHaveBeenCalled();
    expect(generateChatReply).toHaveBeenCalledTimes(1);
    expect(tx.chatMessage.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ content: expect.stringContaining("01 vòng online") }),
    }));
  });

  it("does not retry errors that are not rate limits", async () => {
    const generateChatReply = jest.fn().mockRejectedValue(new Error("invalid JSON"));
    const { service, wait } = setup({ generateChatReply });
    await service.replyTo("c1");
    expect(wait).not.toHaveBeenCalled();
    expect(generateChatReply).toHaveBeenCalledTimes(1);
  });

  it("stops after the maximum number of attempts", async () => {
    const generateChatReply = jest.fn().mockRejectedValue(new QuotaExceededError(1_000));
    const { service, wait } = setup({ generateChatReply });
    await service.replyTo("c1");
    expect(generateChatReply).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
  });
});

describe("findPendingGuestMessage", () => {
  const guest = (id: string) => ({ id, senderType: ChatSenderType.GUEST, content: id, clientMessageId: `client-${id}` });
  const botReplyTo = (id: string) => ({ id: `b-${id}`, senderType: ChatSenderType.BOT, content: "…", clientMessageId: botReplyClientMessageId(id) });

  it("answers a newer guest question even when the previous bot reply landed after it", () => {
    expect(findPendingGuestMessage([guest("g1"), guest("g2"), botReplyTo("g1")])?.id).toBe("g2");
  });

  it("leaves questions TA already answered to TA", () => {
    const taReply = { id: "t1", senderType: ChatSenderType.TA, content: "TA trả lời", clientMessageId: "client-t1" };
    expect(findPendingGuestMessage([guest("g1"), taReply])).toBeNull();
  });

  it("returns null when there is no guest message", () => {
    expect(findPendingGuestMessage([botReplyTo("g0")])).toBeNull();
  });
});
