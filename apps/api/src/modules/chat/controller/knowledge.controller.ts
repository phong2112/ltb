import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { API_ROUTES } from "@hr-copilot/shared";
import { JwtAuthGuard } from "@/modules/auth/guards/index.guard";
import { ACCESS_TOKEN_SECURITY_NAME } from "@/utils/swagger";
import { CreateChatKnowledgeDto, UpdateChatKnowledgeDto } from "../dto/knowledge";
import { ChatKnowledgeService } from "../service/knowledge.service";

@ApiTags("Admin chat knowledge")
@ApiCookieAuth(ACCESS_TOKEN_SECURITY_NAME)
@Controller(`${API_ROUTES.adminChat.base}/${API_ROUTES.adminChat.knowledge}`)
@UseGuards(JwtAuthGuard)
export class ChatKnowledgeController {
  constructor(private readonly knowledge: ChatKnowledgeService) {}

  @Get()
  @ApiOperation({ summary: "List every chat bot knowledge entry" })
  list() {
    return this.knowledge.listAll();
  }

  @Post()
  create(@Body() dto: CreateChatKnowledgeDto) {
    return this.knowledge.create(dto);
  }

  @Patch(API_ROUTES.adminChat.id)
  update(@Param("id") id: string, @Body() dto: UpdateChatKnowledgeDto) {
    return this.knowledge.update(id, dto);
  }

  @Delete(API_ROUTES.adminChat.id)
  remove(@Param("id") id: string) {
    return this.knowledge.remove(id);
  }
}
