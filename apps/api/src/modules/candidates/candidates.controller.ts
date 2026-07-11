import { Body, Controller, Get, Param, Patch, Post, Res, StreamableFile, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CvStorageService } from "../files/cv-storage.service";
import { CreateCandidateMessageDto } from "./dto/create-candidate-message.dto";
import { UpdateApplicationStatusDto } from "./dto/update-application-status.dto";
import { CandidatesService } from "./candidates.service";

@Controller("admin/candidates")
@UseGuards(JwtAuthGuard)
export class CandidatesController {
  constructor(
    private readonly candidatesService: CandidatesService,
    private readonly configService: ConfigService,
    private readonly cvStorageService: CvStorageService,
  ) {}

  @Get()
  listCandidates() {
    return this.candidatesService.listCandidates();
  }

  @Get("files/:fileId")
  async getCandidateFile(@Param("fileId") fileId: string, @Res({ passthrough: true }) response: Response) {
    const file = await this.candidatesService.getCandidateFile(fileId);
    const openedFile = await this.cvStorageService.openCandidateCv(file.path, file.mimeType);

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

  @Get(":id")
  getCandidate(@Param("id") id: string) {
    return this.candidatesService.getCandidate(id);
  }

  @Post(":id/messages")
  createMessage(
    @Param("id") id: string,
    @Body() dto: CreateCandidateMessageDto,
  ) {
    return this.candidatesService.createMessage(id, dto);
  }

  @Patch("applications/:applicationId")
  updateApplication(
    @Param("applicationId") applicationId: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.candidatesService.updateApplication(applicationId, dto);
  }
}

function sanitizeHeaderFilename(value: string) {
  return value.replace(/["\\\r\n]/g, "_");
}

function getFrameAncestors(webOrigin?: string) {
  return Array.from(new Set(["'self'", "http://localhost:3000", "http://localhost:8080", webOrigin].filter(Boolean))).join(" ");
}
