import { Injectable, Logger, NotFoundException, Optional } from "@nestjs/common";
import { ChatConversationMode, ChatSenderType, type ChatConversation, type ChatMessage, type Prisma } from "@prisma/client";
import { PrismaService } from "@/modules/prisma";
import { ChatBotService } from "../bot/reply.service";
import { CHAT_ADMIN_USER_ID, CHAT_BOT_DISPLAY_NAME, CHAT_TA_DISPLAY_NAME, systemClientMessageId } from "../constants";
import { ChatRealtimePublisher } from "../realtime/publisher.service";
import { capitalize } from "../bot/text";

export const CHAT_SYSTEM_MESSAGES = {
  taJoined: `${capitalize(CHAT_TA_DISPLAY_NAME)} (TA) đã tham gia cuộc trò chuyện.`,
  taLeft: `${capitalize(CHAT_TA_DISPLAY_NAME)} (TA) đã rời cuộc trò chuyện. ${CHAT_BOT_DISPLAY_NAME} sẽ tiếp tục hỗ trợ bạn.`,
} as const;

type HandoverTransition = {
  from: ChatConversationMode;
  to: ChatConversationMode;
  event: "ta-joined" | "ta-left";
  content: string;
  action: "chat_ta_joined" | "chat_ta_left";
};

const JOIN: HandoverTransition = {
  from: ChatConversationMode.BOT,
  to: ChatConversationMode.HUMAN,
  event: "ta-joined",
  content: CHAT_SYSTEM_MESSAGES.taJoined,
  action: "chat_ta_joined",
};

const LEAVE: HandoverTransition = {
  from: ChatConversationMode.HUMAN,
  to: ChatConversationMode.BOT,
  event: "ta-left",
  content: CHAT_SYSTEM_MESSAGES.taLeft,
  action: "chat_ta_left",
};

/** Moves a conversation between the bot and TA. Both directions are idempotent. */
@Injectable()
export class ChatHandoverService {
  private readonly logger = new Logger(ChatHandoverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bot: ChatBotService,
    @Optional() private readonly realtime?: ChatRealtimePublisher,
  ) {}

  join(conversationId: string, userId: string) {
    return this.transition(conversationId, userId, JOIN);
  }

  async leave(conversationId: string, userId: string) {
    const result = await this.transition(conversationId, userId, LEAVE);
    // Answers a guest question TA left unanswered; the bot skips when the last turn is not the guest's.
    if (result.changed) this.bot.scheduleReply(conversationId);
    return result;
  }

  private async transition(conversationId: string, userId: string, transition: HandoverTransition) {
    await this.requireConversation(conversationId);
    const at = new Date();

    const message = await this.prisma.$transaction(async tx => {
      const updated = await tx.chatConversation.updateMany({
        where: { id: conversationId, taUserId: CHAT_ADMIN_USER_ID, mode: transition.from },
        data: transitionData(transition, at),
      });
      if (updated.count === 0) return null;

      await tx.activityLog.create({
        data: { actor: "hr", action: transition.action, metadata: { conversationId, userId } },
      });
      return tx.chatMessage.create({
        data: {
          conversationId,
          senderType: ChatSenderType.SYSTEM,
          senderUserId: userId,
          content: transition.content,
          clientMessageId: systemClientMessageId(transition.event, at),
          createdAt: at,
        },
      });
    });

    const conversation = await this.requireConversation(conversationId);
    if (message) this.publish(conversation, message);
    return { changed: message !== null, conversation };
  }

  private async requireConversation(id: string) {
    const conversation = await this.prisma.chatConversation.findFirst({ where: { id, taUserId: CHAT_ADMIN_USER_ID } });
    if (!conversation) throw new NotFoundException("Không tìm thấy cuộc trò chuyện.");
    return conversation;
  }

  private publish(conversation: ChatConversation, message: ChatMessage) {
    try {
      this.realtime?.messageCreated(conversation.guestDeviceId, message);
      this.realtime?.conversationUpdated({
        guestDeviceId: conversation.guestDeviceId,
        conversationId: conversation.id,
        status: conversation.status,
        mode: conversation.mode,
        handoffRequestedAt: conversation.handoffRequestedAt,
        lastMessageAt: conversation.lastMessageAt,
        eventId: `conversation:${conversation.id}:${message.id}`,
      });
    } catch {
      this.logger.warn("chat_realtime_publish_failed");
    }
  }
}

function transitionData(transition: HandoverTransition, at: Date): Prisma.ChatConversationUpdateManyMutationInput {
  if (transition.to === ChatConversationMode.HUMAN) {
    return { mode: ChatConversationMode.HUMAN, taJoinedAt: at, handoffRequestedAt: null, lastMessageAt: at };
  }
  return { mode: ChatConversationMode.BOT, taJoinedAt: null, lastMessageAt: at };
}
