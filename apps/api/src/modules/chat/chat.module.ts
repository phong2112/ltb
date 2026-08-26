import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { createHash } from "node:crypto";
import type { Request } from "express";
import { AuthModule } from "@/modules/auth";
import { readCookie } from "@/modules/auth/guards/index.guard";
import { GUEST_CHAT_COOKIE_NAME } from "./constants";
import { AdminChatController } from "./controller/admin.controller";
import { GuestChatController } from "./controller/guest.controller";
import { ChatRealtimeGateway } from "./realtime/gateway";
import { ChatRealtimePublisher } from "./realtime/publisher.service";
import { ChatRealtimeTicketService } from "./realtime/ticket.service";
import { ChatService } from "./service/index.service";
import { ChatTokenService } from "./service/token.service";

@Module({
  imports: [
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
  controllers: [GuestChatController, AdminChatController],
  providers: [
    ChatService,
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

