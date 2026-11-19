import { NotFoundException } from "@nestjs/common";
import { ChatConversationMode, ChatSenderType } from "@prisma/client";
import type { PrismaService } from "@/modules/prisma";
import type { ChatBotService } from "../bot/reply.service";
import type { ChatRealtimePublisher } from "../realtime/publisher.service";
import { CHAT_SYSTEM_MESSAGES, ChatHandoverService } from "./handover.service";

function setup(options: { exists?: boolean; updateCount?: number } = {}) {
  const conversation = {
    id: "c1",
    guestDeviceId: "device-1",
    status: "OPEN",
    mode: ChatConversationMode.HUMAN,
    handoffRequestedAt: null,
    lastMessageAt: new Date(),
  };
  const tx = {
    chatConversation: { updateMany: jest.fn().mockResolvedValue({ count: options.updateCount ?? 1 }) },
    chatMessage: { create: jest.fn().mockResolvedValue({ id: "system-1", conversationId: "c1", createdAt: new Date() }) },
    activityLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    chatConversation: { findFirst: jest.fn().mockResolvedValue(options.exists === false ? null : conversation) },
    $transaction: jest.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)),
  };
  const bot = { scheduleReply: jest.fn() };
  const realtime = { messageCreated: jest.fn(), conversationUpdated: jest.fn() };
  const service = new ChatHandoverService(
    prisma as unknown as PrismaService,
    bot as unknown as ChatBotService,
    realtime as unknown as ChatRealtimePublisher,
  );
  return { service, tx, bot, realtime };
}

describe("ChatHandoverService", () => {
  it("join pauses the bot, clears the handoff flag, and tells the guest", async () => {
    const { service, tx, realtime } = setup();
    await expect(service.join("c1", "ta-1")).resolves.toEqual(expect.objectContaining({ changed: true }));
    expect(tx.chatConversation.updateMany).toHaveBeenCalledWith({
      where: { id: "c1", taUserId: "hr-admin", mode: ChatConversationMode.BOT },
      data: expect.objectContaining({ mode: ChatConversationMode.HUMAN, handoffRequestedAt: null }),
    });
    expect(tx.chatMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ senderType: ChatSenderType.SYSTEM, content: CHAT_SYSTEM_MESSAGES.taJoined }),
    });
    expect(tx.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "chat_ta_joined" }),
    });
    expect(realtime.messageCreated).toHaveBeenCalledWith("device-1", expect.objectContaining({ id: "system-1" }));
  });

  it("joining twice does not post a second system message", async () => {
    const { service, tx, realtime } = setup({ updateCount: 0 });
    await expect(service.join("c1", "ta-1")).resolves.toEqual(expect.objectContaining({ changed: false }));
    expect(tx.chatMessage.create).not.toHaveBeenCalled();
    expect(realtime.messageCreated).not.toHaveBeenCalled();
  });

  it("leave resumes the bot and lets it answer pending guest questions", async () => {
    const { service, tx, bot } = setup();
    await service.leave("c1", "ta-1");
    expect(tx.chatConversation.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ mode: ChatConversationMode.HUMAN }),
      data: expect.objectContaining({ mode: ChatConversationMode.BOT }),
    }));
    expect(tx.chatMessage.create).toHaveBeenCalledWith({ data: expect.objectContaining({ content: CHAT_SYSTEM_MESSAGES.taLeft }) });
    expect(bot.scheduleReply).toHaveBeenCalledWith("c1");
  });

  it("leaving a conversation the bot already handles is a no-op", async () => {
    const { service, bot } = setup({ updateCount: 0 });
    await service.leave("c1", "ta-1");
    expect(bot.scheduleReply).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown conversation", async () => {
    const { service } = setup({ exists: false });
    await expect(service.join("missing", "ta-1")).rejects.toBeInstanceOf(NotFoundException);
  });
});
