import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { ApiBadRequestResponse, ApiConsumes, ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/index.guard";
import type { AuthenticatedRequest } from "../../auth";
import { ACCESS_TOKEN_SECURITY_NAME } from "../../../utils/swagger";
import { ListTalentPoolDto } from "../dto/list/index.dto";
import { PromoteTalentPoolEntryDto } from "../dto/promote/index.dto";
import { UpdateTalentPoolEntryDto } from "../dto/update/index.dto";
import { UploadTalentPoolDto } from "../dto/upload/index.dto";
import { TalentPoolService } from "../service/index.service";

const MAX_UPLOAD_FILES = 20;

@ApiTags("Talent Pool")
@ApiCookieAuth(ACCESS_TOKEN_SECURITY_NAME)
@Controller("admin/talent-pool")
@UseGuards(JwtAuthGuard)
export class TalentPoolController {
  constructor(private readonly talentPoolService: TalentPoolService) {}

  @ApiOperation({ summary: "Upload one or more candidate CVs into the talent pool" })
  @ApiConsumes("multipart/form-data")
  @ApiBadRequestResponse({ description: "No files, unsupported file type, or file too large." })
  @Post("upload")
  @UseInterceptors(FilesInterceptor("cvs", MAX_UPLOAD_FILES))
  async upload(
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Body() dto: UploadTalentPoolDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const uploads = files ?? [];
    if (!uploads.length) {
      throw new BadRequestException("Vui lòng chọn ít nhất một tệp CV.");
    }

    const results = await this.talentPoolService.uploadMany(uploads, {
      targetJobId: dto.targetJobId?.trim() || undefined,
      uploadedBy: request.user,
    });

    return { results };
  }

  @ApiOperation({ summary: "List talent pool entries" })
  @ApiOkResponse({ description: "Paginated talent pool entries." })
  @Get()
  list(@Query() query: ListTalentPoolDto) {
    return this.talentPoolService.list(query);
  }

  @ApiOperation({ summary: "Get a talent pool entry" })
  @Get(":id")
  getEntry(@Param("id") id: string) {
    return this.talentPoolService.getEntry(id);
  }

  @ApiOperation({ summary: "Update a talent pool entry's parsed profile, tags, or notes" })
  @Patch(":id")
  updateEntry(@Param("id") id: string, @Body() dto: UpdateTalentPoolEntryDto) {
    return this.talentPoolService.updateEntry(id, dto);
  }

  @ApiOperation({ summary: "Promote a pool entry into an application for a job" })
  @Post(":id/promote")
  promote(@Param("id") id: string, @Body() dto: PromoteTalentPoolEntryDto) {
    return this.talentPoolService.promote(id, dto.jobId);
  }

  @ApiOperation({ summary: "Remove a talent pool entry" })
  @Delete(":id")
  deleteEntry(@Param("id") id: string) {
    return this.talentPoolService.deleteEntry(id);
  }
}
