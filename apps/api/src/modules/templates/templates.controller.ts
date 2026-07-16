import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { ACCESS_TOKEN_SECURITY_NAME } from "../../config/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateTemplateDto } from "./dto/create-template.dto";
import { UpdateTemplateDto } from "./dto/update-template.dto";
import { TemplatesService } from "./templates.service";

@ApiTags("Message Templates")
@ApiCookieAuth(ACCESS_TOKEN_SECURITY_NAME)
@ApiUnauthorizedResponse({ description: "Missing or invalid access token." })
@Controller("admin/templates")
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @ApiOperation({ summary: "List message templates for TA follow-up" })
  @ApiOkResponse({ description: "Message templates ordered by creation date." })
  @Get()
  listTemplates() {
    return this.templatesService.listTemplates();
  }

  @ApiOperation({ summary: "Create a message template for TA follow-up" })
  @ApiCreatedResponse({ description: "Created message template." })
  @Post()
  createTemplate(@Body() dto: CreateTemplateDto) {
    return this.templatesService.createTemplate(dto);
  }

  @ApiOperation({ summary: "Update a message template" })
  @ApiParam({ name: "id", example: "cmtemplate123" })
  @ApiOkResponse({ description: "Updated message template." })
  @ApiNotFoundResponse({ description: "Message template not found." })
  @Patch(":id")
  updateTemplate(@Param("id") id: string, @Body() dto: UpdateTemplateDto) {
    return this.templatesService.updateTemplate(id, dto);
  }

  @ApiOperation({ summary: "Delete a message template" })
  @ApiParam({ name: "id", example: "cmtemplate123" })
  @ApiNoContentResponse({ description: "Message template deleted." })
  @ApiNotFoundResponse({ description: "Message template not found." })
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(@Param("id") id: string) {
    await this.templatesService.deleteTemplate(id);
  }
}
