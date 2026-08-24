import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { ACCESS_TOKEN_SECURITY_NAME } from "@/utils/swagger";
import { JwtAuthGuard } from "@/modules/auth/guards/index.guard";
import { CreateJobDto } from "@/modules/jobs/dto/create/index.dto";
import { UpdateJobDto } from "@/modules/jobs/dto/update/index.dto";
import { JobsService } from "@/modules/jobs/service/index.service";

@ApiTags("Jobs")
@Controller()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @ApiOperation({ summary: "List published jobs for the public career site" })
  @ApiOkResponse({ description: "Published jobs ordered by newest first." })
  @Get("jobs/public")
  listPublicJobs() {
    return this.jobsService.listPublicJobs();
  }

  @ApiOperation({ summary: "List jobs for the TA workspace" })
  @ApiCookieAuth(ACCESS_TOKEN_SECURITY_NAME)
  @ApiOkResponse({ description: "All jobs ordered by newest first." })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token." })
  @Get("admin/jobs")
  @UseGuards(JwtAuthGuard)
  listAdminJobs() {
    return this.jobsService.listAdminJobs();
  }

  @ApiOperation({ summary: "Create a job" })
  @ApiCookieAuth(ACCESS_TOKEN_SECURITY_NAME)
  @ApiCreatedResponse({ description: "Created job." })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token." })
  @Post("admin/jobs")
  @UseGuards(JwtAuthGuard)
  createJob(@Body() dto: CreateJobDto) {
    return this.jobsService.createJob(dto);
  }

  @ApiOperation({ summary: "Update a job" })
  @ApiCookieAuth(ACCESS_TOKEN_SECURITY_NAME)
  @ApiParam({ name: "id", example: "cmjob123" })
  @ApiOkResponse({ description: "Updated job." })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token." })
  @ApiNotFoundResponse({ description: "Job not found." })
  @Patch("admin/jobs/:id")
  @UseGuards(JwtAuthGuard)
  updateJob(@Param("id") id: string, @Body() dto: UpdateJobDto) {
    return this.jobsService.updateJob(id, dto);
  }
}
