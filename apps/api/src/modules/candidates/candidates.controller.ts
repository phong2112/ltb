import { Body, Controller, Get, Param, Patch, Post, Res, StreamableFile, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiCookieAuth, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiProduces, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import type { Response } from "express";
import { ACCESS_TOKEN_SECURITY_NAME } from "../../config/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateCandidateMessageDto } from "./dto/create-candidate-message.dto";
import { UpdateApplicationStatusDto } from "./dto/update-application-status.dto";
import { CandidatesService } from "./candidates.service";

@ApiTags("Candidates")
@ApiCookieAuth(ACCESS_TOKEN_SECURITY_NAME)
@ApiUnauthorizedResponse({ description: "Missing or invalid access token." })
@Controller("admin/candidates")
@UseGuards(JwtAuthGuard)
export class CandidatesController {
  constructor(
    private readonly candidatesService: CandidatesService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({ summary: "List candidates for the TA inbox" })
  @ApiOkResponse({
    description: "Candidate profiles with their application history.",
  })
  @Get()
  listCandidates() {
    return this.candidatesService.listCandidates();
  }

  @ApiOperation({ summary: "Stream an uploaded candidate CV file" })
  @ApiParam({ name: "fileId", example: "cmfile123" })
  @ApiProduces("application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
  @ApiOkResponse({ description: "Candidate CV file stream." })
  @ApiNotFoundResponse({ description: "Candidate file not found." })
  @Get("files/:fileId")
  async getCandidateFile(@Param("fileId") fileId: string, @Res({ passthrough: true }) response: Response) {
    const { file, openedFile } = await this.candidatesService.openCandidateFile(fileId);

    response.removeHeader("X-Frame-Options");
    response.set({
      "Content-Type": openedFile.contentType,
      "Content-Length": openedFile.sizeBytes.toString(),
      "Content-Disposition": `inline; filename="${sanitizeHeaderFilename(file.originalName)}"`,
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": `frame-ancestors ${getFrameAncestors(this.configService.get<string>("WEB_ORIGIN"))}`,
    });

    return new StreamableFile(openedFile.stream);
  }

  @ApiOperation({ summary: "Get lightweight CV analysis status and result" })
  @ApiParam({ name: "applicationId", example: "cmapplication123" })
  @ApiOkResponse({ description: "Current CV processing status and match result when available." })
  @ApiNotFoundResponse({ description: "Application or CV analysis not found." })
  @Get("applications/:applicationId/analysis")
  getApplicationAnalysis(@Param("applicationId") applicationId: string) {
    return this.candidatesService.getApplicationAnalysis(applicationId);
  }

  @ApiOperation({ summary: "Get candidate detail" })
  @ApiParam({ name: "id", example: "cmcandidate123" })
  @ApiOkResponse({
    description: "Candidate detail with applications, files, and activity.",
  })
  @ApiNotFoundResponse({ description: "Candidate not found." })
  @Get(":id")
  getCandidate(@Param("id") id: string) {
    return this.candidatesService.getCandidate(id);
  }

  @ApiOperation({ summary: "Create a candidate message log entry" })
  @ApiParam({ name: "id", example: "cmcandidate123" })
  @ApiCreatedResponse({ description: "Created candidate message." })
  @ApiNotFoundResponse({ description: "Candidate not found." })
  @Post(":id/messages")
  createMessage(@Param("id") id: string, @Body() dto: CreateCandidateMessageDto) {
    return this.candidatesService.createMessageForCandidate(id, dto);
  }

  @ApiOperation({
    summary: "Create an application-scoped candidate message log entry",
  })
  @ApiParam({ name: "applicationId", example: "cmapplication123" })
  @ApiCreatedResponse({ description: "Created candidate message." })
  @ApiNotFoundResponse({ description: "Application not found." })
  @Post("applications/:applicationId/messages")
  createApplicationMessage(@Param("applicationId") applicationId: string, @Body() dto: CreateCandidateMessageDto) {
    return this.candidatesService.createMessageForApplication(applicationId, dto);
  }

  @ApiOperation({
    summary: "Update an application status, note, or follow-up date",
  })
  @ApiParam({ name: "applicationId", example: "cmapplication123" })
  @ApiOkResponse({ description: "Updated application." })
  @ApiNotFoundResponse({ description: "Application not found." })
  @Patch("applications/:applicationId")
  updateApplication(@Param("applicationId") applicationId: string, @Body() dto: UpdateApplicationStatusDto) {
    return this.candidatesService.updateApplication(applicationId, dto);
  }
}

function sanitizeHeaderFilename(value: string) {
  return value.replace(/["\\\r\n]/g, "_");
}

function getFrameAncestors(webOrigin?: string) {
  return Array.from(new Set(["'self'", "http://localhost:3000", "http://localhost:8080", webOrigin].filter(Boolean))).join(" ");
}
