import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import { API_ROUTES } from "@hr-copilot/shared";
import { AuthenticatedRequest } from "@/models/auth";
import { JwtAuthGuard } from "@/modules/auth/guards/index.guard";
import { ACCESS_TOKEN_SECURITY_NAME } from "@/utils/swagger";
import { AdminChatQueryDto, ChatMessagesQueryDto, SendChatMessageDto, UpdateChatStatusDto } from "../dto";
import { ChatRealtimeTicketService } from "../realtime/ticket.service";
import { ChatService } from "../service/index.service";

@ApiTags("Admin chat")
@ApiCookieAuth(ACCESS_TOKEN_SECURITY_NAME)
@Controller(API_ROUTES.adminChat.base)
@UseGuards(JwtAuthGuard)
export class AdminChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly realtimeTickets: ChatRealtimeTicketService,
  ) {}

  @Post(API_ROUTES.adminChat.realtimeTicket)
  createRealtimeTicket(@Req() request: AuthenticatedRequest) {
    return this.realtimeTickets.issue("ADMIN", request.user?.sub ?? "hr-admin");
  }

  @Get(API_ROUTES.adminChat.conversations)
  list(@Query() query: AdminChatQueryDto) {
    return this.chatService.listAdminConversations(query.q, query.cursor);
  }

  @Get(API_ROUTES.adminChat.unreadSummary)
  unreadSummary() {
    return this.chatService.getAdminUnreadSummary();
  }

  @Get(`${API_ROUTES.adminChat.conversations}/${API_ROUTES.adminChat.id}`)
  get(@Param("id") id: string, @Query() query: ChatMessagesQueryDto) {
    return this.chatService.getAdminConversation(id, query.cursor);
  }

  @Post(`${API_ROUTES.adminChat.conversations}/${API_ROUTES.adminChat.id}/${API_ROUTES.adminChat.messages}`)
  send(@Param("id") id: string, @Req() request: AuthenticatedRequest, @Body() dto: SendChatMessageDto) {
    return this.chatService.sendAdminMessage(id, request.user?.sub ?? "hr-admin", dto.content, dto.clientMessageId);
  }

  @Post(`${API_ROUTES.adminChat.conversations}/${API_ROUTES.adminChat.id}/${API_ROUTES.adminChat.read}`)
  markRead(@Param("id") id: string) {
    return this.chatService.markAdminRead(id);
  }

  @Patch(`${API_ROUTES.adminChat.conversations}/${API_ROUTES.adminChat.id}/${API_ROUTES.adminChat.status}`)
  updateStatus(@Param("id") id: string, @Body() dto: UpdateChatStatusDto) {
    return this.chatService.updateStatus(id, dto.status);
  }
}
