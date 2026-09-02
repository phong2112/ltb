import { ForbiddenException, Injectable, Logger, NotFoundException, Optional, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ChatConversationStatus, ChatSenderType, Prisma } from "@prisma/client";
import { PrismaService } from "@/modules/prisma";
import { ChatRealtimePublisher } from "../realtime/publisher.service";
import { ChatTokenService } from "./token.service";

const TA_USER_ID = "hr-admin";
const MESSAGE_LIMIT = 50;
const LAST_SEEN_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: ChatTokenService,
    private readonly config: ConfigService,
    @Optional() private readonly realtime?: ChatRealtimePublisher,
  ) {}

  async createOrRotateSession(sessionToken?: string) {
    const existing = sessionToken ? await this.findDeviceBySession(sessionToken) : null;
    const credentials = this.newCredentials();

    if (existing) {
      await this.prisma.guestDevice.update({
        where: { id: existing.id },
        data: credentials.data,
      });
      return credentials.public;
    }

    await this.prisma.guestDevice.create({ data: credentials.data });
    return credentials.public;
  }

  async restoreSession(recoveryToken: string) {
    const device = await this.prisma.guestDevice.findUnique({
      where: { recoveryTokenHash: this.tokens.hash(recoveryToken) },
    });

    if (!device || device.recoveryExpiresAt <= new Date()) {
      throw new UnauthorizedException("Liên kết khôi phục cuộc trò chuyện không còn hợp lệ.");
    }

    const credentials = this.newCredentials();
    await this.prisma.guestDevice.update({ where: { id: device.id }, data: credentials.data });
    return credentials.public;
  }

  async resetSession() {
    const credentials = this.newCredentials();
    await this.prisma.guestDevice.create({ data: credentials.data });
    return credentials.public;
  }

  async getGuestConversation(sessionToken: string) {
    const device = await this.requireDevice(sessionToken);
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { guestDeviceId_taUserId: { guestDeviceId: device.id, taUserId: TA_USER_ID } },
      select: {
        status: true,
        lastMessageAt: true,
        candidate: {
          select: { fullName: true },
        },
      },
    });

    return conversation ?? null;
  }

  async getGuestSnapshot(sessionToken: string) {
    const device = await this.requireDevice(sessionToken);
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { guestDeviceId_taUserId: { guestDeviceId: device.id, taUserId: TA_USER_ID } },
      select: {
        status: true,
        lastMessageAt: true,
        candidate: { select: { fullName: true } },
        messages: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: MESSAGE_LIMIT + 1,
        },
      },
    });

    if (!conversation) {
      return { conversation: null, messages: { items: [], nextCursor: null } };
    }

    const { messages, ...metadata } = conversation;
    const hasMore = messages.length > MESSAGE_LIMIT;
    const page = hasMore ? messages.slice(0, MESSAGE_LIMIT) : messages;
    return {
      conversation: metadata,
      messages: {
        items: page.reverse(),
        nextCursor: hasMore ? page[0]?.id ?? null : null,
      },
    };
  }

  async getGuestRealtimeIdentity(sessionToken: string) {
    const device = await this.requireDevice(sessionToken);
    return device.id;
  }

  async sendGuestMessage(sessionToken: string, content: string, clientMessageId: string) {
    const device = await this.requireDevice(sessionToken);
    const trimmed = content.trim();
    const now = new Date();

    const result = await this.prisma.$transaction(async tx => {
      let conversation = await tx.chatConversation.upsert({
        where: { guestDeviceId_taUserId: { guestDeviceId: device.id, taUserId: TA_USER_ID } },
        create: { guestDeviceId: device.id, taUserId: TA_USER_ID, lastMessageAt: now },
        update: {},
      });

      if (conversation.status === ChatConversationStatus.BLOCKED) {
        throw new ForbiddenException("Cuộc trò chuyện này đã bị chặn.");
      }
      if (conversation.status === ChatConversationStatus.CLOSED) {
        conversation = await tx.chatConversation.update({
          where: { id: conversation.id },
          data: { status: ChatConversationStatus.OPEN },
        });
      }

      const message = await tx.chatMessage.upsert({
        where: { conversationId_clientMessageId: { conversationId: conversation.id, clientMessageId } },
        update: {},
        create: {
          conversationId: conversation.id,
          senderType: ChatSenderType.GUEST,
          content: trimmed,
          clientMessageId,
        },
      });
      await tx.chatConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: message.createdAt } });
      return { message, conversation: { ...conversation, lastMessageAt: message.createdAt } };
    });

    this.publishRealtime(() => {
      this.realtime?.messageCreated(device.id, result.message);
      this.realtime?.conversationUpdated({
        guestDeviceId: device.id,
        conversationId: result.conversation.id,
        status: result.conversation.status,
        lastMessageAt: result.message.createdAt,
        eventId: "conversation:" + result.conversation.id + ":" + result.message.id,
      });
    });
    return result.message;
  }

  async markGuestRead(sessionToken: string) {
    const device = await this.requireDevice(sessionToken);
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { guestDeviceId_taUserId: { guestDeviceId: device.id, taUserId: TA_USER_ID } },
      select: { id: true, guestDeviceId: true },
    });
    if (!conversation) return { count: 0 };
    const readAt = new Date();
    const result = await this.prisma.chatMessage.updateMany({
      where: { conversationId: conversation.id, senderType: ChatSenderType.TA, readAt: null },
      data: { readAt },
    });
    if (result.count > 0) {
      this.publishRealtime(() => this.realtime?.readUpdated({
        guestDeviceId: conversation.guestDeviceId,
        conversationId: conversation.id,
        reader: "GUEST",
        readAt,
      }));
    }
    return result;
  }

  async linkApplication(sessionToken: string | undefined, candidateId: string, applicationId: string) {
    if (!sessionToken) return false;
    const device = await this.findDeviceBySession(sessionToken);
    if (!device) return false;

    const existing = await this.prisma.chatConversation.findUnique({
      where: { guestDeviceId_taUserId: { guestDeviceId: device.id, taUserId: TA_USER_ID } },
    });
    if (existing?.candidateId && existing.candidateId !== candidateId) return false;

    await this.prisma.chatConversation.upsert({
      where: { guestDeviceId_taUserId: { guestDeviceId: device.id, taUserId: TA_USER_ID } },
      create: { guestDeviceId: device.id, taUserId: TA_USER_ID, candidateId, applicationId },
      update: { candidateId, applicationId },
    });
    return true;
  }

  async listAdminConversations(q?: string, cursor?: string) {
    const search = q?.trim();
    const where: Prisma.ChatConversationWhereInput = {
      taUserId: TA_USER_ID,
      lastMessageAt: { not: null },
      ...(search
        ? {
            OR: [
              { candidate: { fullName: { contains: search, mode: "insensitive" } } },
              { candidate: { email: { contains: search, mode: "insensitive" } } },
              { candidate: { phone: { contains: search } } },
            ],
          }
        : {}),
    };
    const items = await this.prisma.chatConversation.findMany({
      where,
      orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
      take: 31,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        candidate: { select: { id: true, fullName: true, email: true, phone: true } },
        application: { select: { id: true, job: { select: { id: true, title: true } } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { messages: { where: { senderType: ChatSenderType.GUEST, readAt: null } } } },
      },
    });
    const hasMore = items.length > 30;
    const visible = hasMore ? items.slice(0, 30) : items;
    return { items: visible, nextCursor: hasMore ? visible.at(-1)?.id ?? null : null };
  }

  async getAdminUnreadSummary() {
    const unreadMessages = await this.prisma.chatMessage.count({
      where: {
        senderType: ChatSenderType.GUEST,
        readAt: null,
        conversation: { taUserId: TA_USER_ID },
      },
    });

    return { unreadMessages };
  }

  async getAdminConversation(id: string, cursor?: string) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id, taUserId: TA_USER_ID },
      include: {
        candidate: { select: { id: true, fullName: true, email: true, phone: true } },
        application: { select: { id: true, job: { select: { id: true, title: true } } } },
      },
    });
    if (!conversation) throw new NotFoundException("Không tìm thấy cuộc trò chuyện.");
    return { conversation, ...(await this.getMessages(id, cursor)) };
  }

  async sendAdminMessage(id: string, userId: string, content: string, clientMessageId: string) {
    const conversation = await this.requireAdminConversation(id);
    if (conversation.status === ChatConversationStatus.BLOCKED) {
      throw new ForbiddenException("Hãy bỏ chặn trước khi gửi tin nhắn.");
    }
    const shouldReopen = conversation.status === ChatConversationStatus.CLOSED;
    const trimmed = content.trim();
    const message = await this.prisma.$transaction(async tx => {
      const created = await tx.chatMessage.upsert({
        where: { conversationId_clientMessageId: { conversationId: id, clientMessageId } },
        update: {},
        create: { conversationId: id, senderType: ChatSenderType.TA, senderUserId: userId, content: trimmed, clientMessageId },
      });
      await tx.chatConversation.update({
        where: { id },
        data: { lastMessageAt: created.createdAt, ...(shouldReopen ? { status: ChatConversationStatus.OPEN } : {}) },
      });
      return created;
    });
    const status = shouldReopen ? ChatConversationStatus.OPEN : conversation.status;
    this.publishRealtime(() => {
      this.realtime?.messageCreated(conversation.guestDeviceId, message);
      this.realtime?.conversationUpdated({
        guestDeviceId: conversation.guestDeviceId,
        conversationId: id,
        status,
        lastMessageAt: message.createdAt,
        eventId: "conversation:" + id + ":" + message.id,
      });
    });
    return message;
  }

  async markAdminRead(id: string) {
    const conversation = await this.requireAdminConversation(id);
    const readAt = new Date();
    const result = await this.prisma.chatMessage.updateMany({
      where: { conversationId: id, senderType: ChatSenderType.GUEST, readAt: null },
      data: { readAt },
    });
    if (result.count > 0) {
      this.publishRealtime(() => this.realtime?.readUpdated({
        guestDeviceId: conversation.guestDeviceId,
        conversationId: id,
        reader: "ADMIN",
        readAt,
      }));
    }
    return result;
  }

  async updateStatus(id: string, status: ChatConversationStatus) {
    const conversation = await this.requireAdminConversation(id);
    const updated = await this.prisma.chatConversation.update({ where: { id }, data: { status } });
    this.publishRealtime(() => this.realtime?.conversationUpdated({
      guestDeviceId: conversation.guestDeviceId,
      conversationId: id,
      status: updated.status,
      lastMessageAt: updated.lastMessageAt,
      eventId: "conversation:" + id + ":status:" + updated.updatedAt.getTime(),
    }));
    return updated;
  }

  private async getMessages(conversationId: string, cursor?: string) {
    const rows = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: MESSAGE_LIMIT + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > MESSAGE_LIMIT;
    const page = hasMore ? rows.slice(0, MESSAGE_LIMIT) : rows;
    return { items: page.reverse(), nextCursor: hasMore ? page[0]?.id ?? null : null };
  }

  private async requireDevice(sessionToken: string) {
    const device = await this.findDeviceBySession(sessionToken);
    if (!device) throw new UnauthorizedException("Phiên trò chuyện không tồn tại hoặc đã hết hạn.");
    const now = new Date();
    if (!device.lastSeenAt || now.getTime() - device.lastSeenAt.getTime() >= LAST_SEEN_TOUCH_INTERVAL_MS) {
      await this.prisma.guestDevice.update({ where: { id: device.id }, data: { lastSeenAt: now } });
    }
    return device;
  }

  private findDeviceBySession(sessionToken: string) {
    if (!sessionToken) return null;
    return this.prisma.guestDevice.findFirst({
      where: { sessionTokenHash: this.tokens.hash(sessionToken), sessionExpiresAt: { gt: new Date() } },
    });
  }

  private async requireAdminConversation(id: string) {
    const conversation = await this.prisma.chatConversation.findFirst({ where: { id, taUserId: TA_USER_ID } });
    if (!conversation) throw new NotFoundException("Không tìm thấy cuộc trò chuyện.");
    return conversation;
  }

  private publishRealtime(publish: () => void) {
    try {
      publish();
    } catch {
      this.logger.warn("chat_realtime_publish_failed");
    }
  }

  private newCredentials() {
    const sessionToken = this.tokens.generate();
    const recoveryToken = this.tokens.generate();
    const sessionTtlDays = this.config.get<number>("GUEST_CHAT_SESSION_TTL_DAYS") ?? 7;
    const recoveryTtlDays = this.config.get<number>("GUEST_CHAT_RECOVERY_TTL_DAYS") ?? 90;
    return {
      public: { sessionToken, recoveryToken, sessionMaxAgeSeconds: sessionTtlDays * 86400 },
      data: {
        sessionTokenHash: this.tokens.hash(sessionToken),
        recoveryTokenHash: this.tokens.hash(recoveryToken),
        sessionExpiresAt: this.tokens.expiresInDays(sessionTtlDays),
        recoveryExpiresAt: this.tokens.expiresInDays(recoveryTtlDays),
        lastSeenAt: new Date(),
      },
    };
  }
}
