import { UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { ChatConversationStatus, ChatSenderType } from "@prisma/client";
import type { PrismaService } from "@/modules/prisma";
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
});
