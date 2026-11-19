import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { createHash } from "node:crypto";
import type { Request } from "express";
import { AiModelsModule } from "@/modules/ai/models.module";
import { AuthModule } from "@/modules/auth";
import { readCookie } from "@/modules/auth/guards/index.guard";
import { GUEST_CHAT_COOKIE_NAME } from "./constants";
import { ChatBotService } from "./bot/reply.service";
import { AdminChatController } from "./controller/admin.controller";
import { GuestChatController } from "./controller/guest.controller";
import { ChatKnowledgeController } from "./controller/knowledge.controller";
import { ChatRealtimeGateway } from "./realtime/gateway";
import { ChatRealtimePublisher } from "./realtime/publisher.service";
import { ChatRealtimeTicketService } from "./realtime/ticket.service";
import { ChatHandoverService } from "./service/handover.service";
import { ChatService } from "./service/index.service";
import { ChatKnowledgeService } from "./service/knowledge.service";
import { ChatTokenService } from "./service/token.service";

@Module({
  imports: [
    AiModelsModule,
    AuthModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: "chat",
          limit: config.get<number>("GUEST_CHAT_RATE_LIMIT_MAX") ?? 300,
          ttl: (config.get<number>("GUEST_CHAT_RATE_LIMIT_WINDOW_SECONDS") ?? 60) * 1000,
          getTracker: getGuestChatTracker,
        },
      ],
    }),
  ],
  controllers: [GuestChatController, AdminChatController, ChatKnowledgeController],
  providers: [
    ChatService,
    ChatBotService,
    ChatHandoverService,
    ChatKnowledgeService,
    ChatTokenService,
    ChatRealtimeTicketService,
    ChatRealtimePublisher,
    ChatRealtimeGateway,
  ],
  exports: [ChatService],
})
export class ChatModule {}

async function getGuestChatTracker(request: Record<string, unknown>) {
  const httpRequest = request as unknown as Request;
  const sessionToken = readCookie(httpRequest, GUEST_CHAT_COOKIE_NAME);
  if (sessionToken) {
    return "device:" + createHash("sha256").update(sessionToken).digest("hex");
  }
  return httpRequest.ip || httpRequest.socket.remoteAddress || "unknown";
}

