import { Body, Controller, ForbiddenException, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SkipThrottle, Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { API_ROUTES } from "@hr-copilot/shared";
import type { Request, Response } from "express";
import { readCookie } from "@/modules/auth/guards/index.guard";
import { createCorsOriginOptions } from "@/utils/cors";
import { GUEST_CHAT_COOKIE_NAME } from "../constants";
import { RestoreGuestSessionDto, SendChatMessageDto } from "../dto";
import { ChatRealtimeTicketService } from "../realtime/ticket.service";
import { ChatService } from "../service/index.service";

@ApiTags("Guest chat")
@Controller(API_ROUTES.chat.base)
@UseGuards(ThrottlerGuard)
export class GuestChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly config: ConfigService,
    private readonly realtimeTickets: ChatRealtimeTicketService,
  ) {}

  @Post(API_ROUTES.chat.session)
  @ApiOperation({ summary: "Create a guest chat session or rotate its credentials" })
  async createSession(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.assertAllowedOrigin(request);
    const result = await this.chatService.createOrRotateSession(readCookie(request, GUEST_CHAT_COOKIE_NAME));
    this.setSessionCookie(response, result.sessionToken, result.sessionMaxAgeSeconds);
    return { recoveryToken: result.recoveryToken };
  }

  @Post(API_ROUTES.chat.restore)
  @ApiOperation({ summary: "Restore a guest session with a rotating recovery token" })
  async restoreSession(@Req() request: Request, @Body() dto: RestoreGuestSessionDto, @Res({ passthrough: true }) response: Response) {
    this.assertAllowedOrigin(request);
    const result = await this.chatService.restoreSession(dto.recoveryToken);
    this.setSessionCookie(response, result.sessionToken, result.sessionMaxAgeSeconds);
    return { recoveryToken: result.recoveryToken };
  }

  @Post(API_ROUTES.chat.reset)
  @ApiOperation({ summary: "Start a new guest identity on this browser" })
  async resetSession(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.assertAllowedOrigin(request);
    const result = await this.chatService.resetSession();
    this.setSessionCookie(response, result.sessionToken, result.sessionMaxAgeSeconds);
    return { recoveryToken: result.recoveryToken };
  }

  @Post(API_ROUTES.chat.realtimeTicket)
  @SkipThrottle({ chat: true })
  async createRealtimeTicket(@Req() request: Request) {
    this.assertAllowedOrigin(request);
    const deviceId = await this.chatService.getGuestRealtimeIdentity(this.sessionToken(request));
    return this.realtimeTickets.issue("GUEST", deviceId);
  }

  @Get(API_ROUTES.chat.conversation)
  @SkipThrottle({ chat: true })
  getConversation(@Req() request: Request) {
    return this.chatService.getGuestSnapshot(this.sessionToken(request));
  }

  @Post(API_ROUTES.chat.messages)
  @Throttle({ chat: { limit: 60, ttl: 60_000 } })
  sendMessage(@Req() request: Request, @Body() dto: SendChatMessageDto) {
    this.assertAllowedOrigin(request);
    return this.chatService.sendGuestMessage(this.sessionToken(request), dto.content, dto.clientMessageId);
  }

  @Post(API_ROUTES.chat.read)
  @SkipThrottle({ chat: true })
  markRead(@Req() request: Request) {
    this.assertAllowedOrigin(request);
    return this.chatService.markGuestRead(this.sessionToken(request));
  }

  private sessionToken(request: Request) {
    return readCookie(request, GUEST_CHAT_COOKIE_NAME);
  }

  private assertAllowedOrigin(request: Request) {
    const origin = request.headers.origin;
    let allowed = false;
    createCorsOriginOptions(this.config)(origin, (_error, result) => { allowed = result === true; });
    if (!allowed) throw new ForbiddenException("Origin không được phép.");
  }

  private setSessionCookie(response: Response, token: string, maxAgeSeconds: number) {
    const secure = this.shouldUseSecureCookie();
    response.cookie(GUEST_CHAT_COOKIE_NAME, token, {
      httpOnly: true,
      secure,
      sameSite: secure ? "none" : "lax",
      maxAge: maxAgeSeconds * 1000,
      path: "/",
    });
  }

  private shouldUseSecureCookie() {
    const configured = this.config.get<string>("AUTH_COOKIE_SECURE");
    return configured ? configured === "true" : this.config.get<string>("NODE_ENV") === "production";
  }
}

export { GUEST_CHAT_COOKIE_NAME } from "../constants";
