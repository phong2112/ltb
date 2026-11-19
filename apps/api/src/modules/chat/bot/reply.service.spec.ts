import { Logger } from "@nestjs/common";
import { ChatConversationMode, ChatConversationStatus, ChatSenderType } from "@prisma/client";
import type { AiModelPortalService } from "@/modules/ai/portal/index.service";
import type { PrismaService } from "@/modules/prisma";
import { botReplyClientMessageId } from "../constants";
import type { ChatRealtimePublisher } from "../realtime/publisher.service";
import type { ChatKnowledgeService } from "../service/knowledge.service";
import { CHAT_BOT_FALLBACK_REPLIES } from "./prompt";
import { ChatBotService, findPendingGuestMessage } from "./reply.service";

type Message = { id: string; senderType: ChatSenderType; content: string; clientMessageId?: string };

function setup(options: {
  mode?: ChatConversationMode;
  status?: ChatConversationStatus;
  messagesNewestFirst?: Message[];
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
        messages: options.messagesNewestFirst ?? [{ id: "g1", senderType: ChatSenderType.GUEST, content: "Phỏng vấn mấy vòng?" }],
      }),
    },
    job: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)),
  };
  const ai = {
    chatEnabled: options.chatEnabled ?? true,
    generateChatReply: options.generateChatReply ?? jest.fn().mockResolvedValue({ reply: "Một vòng online.", handoff: false }),
  };
  const knowledge = { listActive: jest.fn().mockResolvedValue([{ category: "FAQ", title: "Phỏng vấn mấy vòng", content: "01 vòng online" }]) };
  const realtime = { messageCreated: jest.fn(), conversationUpdated: jest.fn() };
  const service = new ChatBotService(
    prisma as unknown as PrismaService,
    ai as unknown as AiModelPortalService,
    knowledge as unknown as ChatKnowledgeService,
    realtime as unknown as ChatRealtimePublisher,
  );
  return { service, prisma, tx, ai, realtime };
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
    const { service, ai, tx } = setup({ chatEnabled: false });
    await service.replyTo("c1");
    expect(ai.generateChatReply).not.toHaveBeenCalled();
    expect(tx.chatMessage.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ content: expect.stringContaining("01 vòng online") }),
    }));
  });

  it("stores a fallback reply and requests handoff when the AI fails", async () => {
    const { service, tx } = setup({ generateChatReply: jest.fn().mockRejectedValue(new Error("timeout")) });
    await service.replyTo("c1");
    expect(tx.chatMessage.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ content: CHAT_BOT_FALLBACK_REPLIES.providerFailed }),
    }));
    expect(tx.chatConversation.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ handoffRequestedAt: expect.any(Date) }),
    }));
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
