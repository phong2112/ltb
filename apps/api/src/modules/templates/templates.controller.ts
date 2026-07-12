import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { ACCESS_TOKEN_SECURITY_NAME } from "../../config/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TemplatesService } from "./templates.service";

@ApiTags("Message Templates")
@ApiCookieAuth(ACCESS_TOKEN_SECURITY_NAME)
@ApiUnauthorizedResponse({ description: "Missing or invalid access token." })
@Controller("admin/templates")
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @ApiOperation({ summary: "List message templates for HR follow-up" })
  @ApiOkResponse({ description: "Message templates ordered by creation date." })
  @Get()
  listTemplates() {
    return this.templatesService.listTemplates();
  }
}
