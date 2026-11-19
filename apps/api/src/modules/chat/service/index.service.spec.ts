import { UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { ChatConversationMode, ChatConversationStatus, ChatSenderType } from "@prisma/client";
import type { PrismaService } from "@/modules/prisma";
import type { ChatBotService } from "../bot/reply.service";
import type { ChatHandoverService } from "./handover.service";
import { ChatService } from "./index.service";
import type { ChatTokenService } from "./token.service";

describe("ChatService", () => {
  const tokenService = {
    hash: jest.fn((value: string) => `hash:${value}`),
    generate: jest.fn(),
    expiresInDays: jest.fn(),
  } as unknown as ChatTokenService;
  const config = { get: jest.fn() } as unknown as ConfigService;

  it("rejects an expired recovery token", async () => {
    const prisma = {
      guestDevice: {
        findUnique: jest.fn().mockResolvedValue({
          id: "device-1",
          recoveryExpiresAt: new Date(Date.now() - 1),
        }),
      },
    };
    const service = new ChatService(prisma as unknown as PrismaService, tokenService, config);

    await expect(service.restoreSession("expired-token")).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.guestDevice.findUnique).toHaveBeenCalledWith({
      where: { recoveryTokenHash: "hash:expired-token" },
    });
  });

  it("does not relink a shared browser conversation to another candidate", async () => {
    const prisma = {
      guestDevice: {
        findFirst: jest.fn().mockResolvedValue({ id: "device-1" }),
      },
      chatConversation: {
        findUnique: jest.fn().mockResolvedValue({ candidateId: "candidate-original" }),
        upsert: jest.fn(),
      },
    };
    const service = new ChatService(prisma as unknown as PrismaService, tokenService, config);

    await expect(service.linkApplication("session", "candidate-other", "application-2")).resolves.toBe(false);
    expect(prisma.chatConversation.upsert).not.toHaveBeenCalled();
  });

  it("counts unread guest messages for the admin inbox", async () => {
    const count = jest.fn().mockResolvedValue(4);
    const prisma = { chatMessage: { count } };
    const service = new ChatService(prisma as unknown as PrismaService, tokenService, config);

    await expect(service.getAdminUnreadSummary()).resolves.toEqual({ unreadMessages: 4 });
    expect(count).toHaveBeenCalledWith({
      where: {
        senderType: ChatSenderType.GUEST,
        readAt: null,
        conversation: { taUserId: "hr-admin" },
      },
    });
  });

  it("returns the original message for a repeated client id", async () => {
    const existingMessage = {
      id: "message-1",
      conversationId: "conversation-1",
      senderType: ChatSenderType.GUEST,
      senderUserId: null,
      content: "Xin chào",
      clientMessageId: "5ef38c36-6ec7-4e6b-a8e8-f87ed17a5c55",
      readAt: null,
      createdAt: new Date(),
    };
    const transaction = {
      chatConversation: {
        upsert: jest.fn().mockResolvedValue({
          id: "conversation-1",
          status: ChatConversationStatus.OPEN,
        }),
        update: jest.fn(),
      },
      chatMessage: {
        upsert: jest.fn().mockResolvedValue(existingMessage),
      },
    };
    const prisma = {
      guestDevice: {
        findFirst: jest.fn().mockResolvedValue({ id: "device-1" }),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) => callback(transaction)),
    };
    const service = new ChatService(prisma as unknown as PrismaService, tokenService, config);

    await expect(
      service.sendGuestMessage("session", "Xin chào", existingMessage.clientMessageId),
    ).resolves.toEqual(existingMessage);
    expect(transaction.chatMessage.upsert).toHaveBeenCalledWith({
      where: {
        conversationId_clientMessageId: {
          conversationId: "conversation-1",
          clientMessageId: existingMessage.clientMessageId,
        },
      },
      update: {},
      create: expect.objectContaining({ content: "Xin chào" }),
    });
  });
  it("publishes a message only after its database transaction commits", async () => {
    const order: string[] = [];
    const message = {
      id: "message-2",
      conversationId: "conversation-1",
      senderType: ChatSenderType.GUEST,
      senderUserId: null,
      content: "Realtime",
      clientMessageId: "53c99589-d476-4f7d-a1cb-f0b2a8af4c60",
      readAt: null,
      createdAt: new Date(),
    };
    const transaction = {
      chatConversation: {
        upsert: jest.fn().mockResolvedValue({
          id: "conversation-1",
          guestDeviceId: "device-1",
          status: ChatConversationStatus.OPEN,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      chatMessage: { upsert: jest.fn().mockResolvedValue(message) },
    };
    const prisma = {
      guestDevice: {
        findFirst: jest.fn().mockResolvedValue({ id: "device-1" }),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) => {
        const result = await callback(transaction);
        order.push("commit");
        return result;
      }),
    };
    const realtime = {
      messageCreated: jest.fn(() => order.push("emit")),
      conversationUpdated: jest.fn(),
    };
    const service = new ChatService(
      prisma as unknown as PrismaService,
      tokenService,
      config,
      realtime as never,
    );

    await expect(service.sendGuestMessage("session", message.content, message.clientMessageId)).resolves.toEqual(message);
    expect(order).toEqual(["commit", "emit"]);
  });

  describe("bot hand-off", () => {
    function guestSendSetup(mode: ChatConversationMode, content = "Phỏng vấn mấy vòng?") {
      const message = {
        id: "message-3",
        conversationId: "conversation-1",
        senderType: ChatSenderType.GUEST,
        senderUserId: null,
        content,
        clientMessageId: "0b8c3b8e-8d55-4d0f-9f2b-0e9c4a3c6c11",
        readAt: null,
        createdAt: new Date(),
      };
      const transaction = {
        chatConversation: {
          upsert: jest.fn().mockResolvedValue({
            id: "conversation-1",
            guestDeviceId: "device-1",
            status: ChatConversationStatus.OPEN,
            mode,
            handoffRequestedAt: null,
          }),
          update: jest.fn().mockResolvedValue({}),
        },
        chatMessage: { upsert: jest.fn().mockResolvedValue(message) },
      };
      const prisma = {
        guestDevice: {
          findFirst: jest.fn().mockResolvedValue({ id: "device-1", lastSeenAt: new Date() }),
          update: jest.fn(),
        },
        $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) => callback(transaction)),
      };
      const bot = { scheduleReply: jest.fn() };
      const service = new ChatService(
        prisma as unknown as PrismaService,
        tokenService,
        config,
        undefined,
        bot as unknown as ChatBotService,
      );
      return { service, transaction, bot, message };
    }

    it("lets the bot answer guest messages while it handles the conversation", async () => {
      const { service, bot, message } = guestSendSetup(ChatConversationMode.BOT);
      await service.sendGuestMessage("session", message.content, message.clientMessageId);
      expect(bot.scheduleReply).toHaveBeenCalledWith("conversation-1");
    });

    it("keeps the bot quiet once TA has joined", async () => {
      const { service, bot, message } = guestSendSetup(ChatConversationMode.HUMAN);
      await service.sendGuestMessage("session", message.content, message.clientMessageId);
      expect(bot.scheduleReply).not.toHaveBeenCalled();
    });

    it("flags the conversation for TA when the guest asks for a human", async () => {
      const { service, transaction, message } = guestSendSetup(ChatConversationMode.BOT, "Cho mình gặp HR nhé");
      await service.sendGuestMessage("session", message.content, message.clientMessageId);
      expect(transaction.chatConversation.update).toHaveBeenCalledWith({
        where: { id: "conversation-1" },
        data: { lastMessageAt: message.createdAt, handoffRequestedAt: message.createdAt },
      });
    });

    it("does not flag a hand-off when TA is already in the conversation", async () => {
      const { service, transaction, message } = guestSendSetup(ChatConversationMode.HUMAN, "Cho mình gặp HR nhé");
      await service.sendGuestMessage("session", message.content, message.clientMessageId);
      expect(transaction.chatConversation.update).toHaveBeenCalledWith({
        where: { id: "conversation-1" },
        data: { lastMessageAt: message.createdAt, handoffRequestedAt: null },
      });
    });

    it("pauses the bot before TA replies in a bot-handled conversation", async () => {
      const botConversation = {
        id: "conversation-1",
        guestDeviceId: "device-1",
        status: ChatConversationStatus.OPEN,
        mode: ChatConversationMode.BOT,
      };
      const joinedConversation = { ...botConversation, mode: ChatConversationMode.HUMAN };
      const sent = { id: "message-4", createdAt: new Date() };
      const transaction = {
        chatMessage: { upsert: jest.fn().mockResolvedValue(sent) },
        chatConversation: { update: jest.fn() },
      };
      const prisma = {
        chatConversation: { findFirst: jest.fn().mockResolvedValue(botConversation) },
        $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) => callback(transaction)),
      };
      const handover = { join: jest.fn().mockResolvedValue({ changed: true, conversation: joinedConversation }) };
      const realtime = { messageCreated: jest.fn(), conversationUpdated: jest.fn() };
      const service = new ChatService(
        prisma as unknown as PrismaService,
        tokenService,
        config,
        realtime as never,
        undefined,
        handover as unknown as ChatHandoverService,
      );

      await service.sendAdminMessage("conversation-1", "ta-1", "Chào bạn", "f3b1d2a4-5c6e-4f70-8a9b-0c1d2e3f4a5b");
      expect(handover.join).toHaveBeenCalledWith("conversation-1", "ta-1");
      expect(realtime.conversationUpdated).toHaveBeenCalledWith(expect.objectContaining({ mode: ChatConversationMode.HUMAN }));
    });
  });
});
