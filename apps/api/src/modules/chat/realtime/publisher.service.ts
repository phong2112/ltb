import { Injectable } from "@nestjs/common";
import {
  CHAT_REALTIME_EVENTS,
  type ChatConversationUpdatedEvent,
  type ChatMessageCreatedEvent,
  type ChatReadUpdatedEvent,
  type ChatRealtimeRole,
} from "@hr-copilot/shared";
import type { ChatConversationStatus, ChatMessage } from "@prisma/client";
import type { Server } from "socket.io";
import { adminChatRoom, CHAT_ADMIN_USER_ID, guestChatRoom } from "../constants";

@Injectable()
export class ChatRealtimePublisher {
  private server?: Server;

  bind(server: Server) {
    this.server = server;
  }

  messageCreated(guestDeviceId: string, message: ChatMessage) {
    const payload: ChatMessageCreatedEvent = {
      eventId: message.id,
      conversationId: message.conversationId,
      message: {
        ...message,
        createdAt: message.createdAt.toISOString(),
        readAt: message.readAt?.toISOString() ?? null,
      },
    };
    this.emitToConversation(guestDeviceId, CHAT_REALTIME_EVENTS.messageCreated, payload);
  }

  conversationUpdated(input: {
    guestDeviceId: string;
    conversationId: string;
    status: ChatConversationStatus;
    lastMessageAt?: Date | null;
    eventId: string;
  }) {
    const payload: ChatConversationUpdatedEvent = {
      eventId: input.eventId,
      conversationId: input.conversationId,
      status: input.status,
      lastMessageAt: input.lastMessageAt?.toISOString() ?? null,
    };
    this.emitToConversation(input.guestDeviceId, CHAT_REALTIME_EVENTS.conversationUpdated, payload);
  }

  readUpdated(input: {
    guestDeviceId: string;
    conversationId: string;
    reader: ChatRealtimeRole;
    readAt: Date;
  }) {
    const payload: ChatReadUpdatedEvent = {
      eventId: `${input.conversationId}:${input.reader}:${input.readAt.getTime()}`,
      conversationId: input.conversationId,
      reader: input.reader,
      readAt: input.readAt.toISOString(),
    };
    this.emitToConversation(input.guestDeviceId, CHAT_REALTIME_EVENTS.readUpdated, payload);
  }

  private emitToConversation(guestDeviceId: string, event: string, payload: object) {
    if (!this.server) return;
    this.server.to(guestChatRoom(guestDeviceId)).to(adminChatRoom(CHAT_ADMIN_USER_ID)).emit(event, payload);
  }
}
