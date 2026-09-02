import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { API_ROUTES } from "@hr-copilot/shared";
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
import { ListJobsDto } from "@/modules/jobs/dto/list/index.dto";
import { UpdateJobDto } from "@/modules/jobs/dto/update/index.dto";
import { JobsListGuard } from "@/modules/jobs/guards/jobs-list.guard";
import { JobsService } from "@/modules/jobs/service/index.service";

@ApiTags("Jobs")
@Controller()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @ApiOperation({ summary: "List published jobs, or all jobs with scope=admin" })
  @ApiCookieAuth(ACCESS_TOKEN_SECURITY_NAME)
  @ApiOkResponse({ description: "Published jobs by default; all jobs when scope=admin is authorized." })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token for scope=admin." })
  @Get(API_ROUTES.jobs.base)
  @UseGuards(JobsListGuard)
  listJobs(@Query() query: ListJobsDto) {
    return query.scope === API_ROUTES.jobs.adminScope
      ? this.jobsService.listAdminJobs()
      : this.jobsService.listPublicJobs();
  }

  @ApiOperation({ summary: "Create a job" })
  @ApiCookieAuth(ACCESS_TOKEN_SECURITY_NAME)
  @ApiCreatedResponse({ description: "Created job." })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token." })
  @Post(API_ROUTES.jobs.base)
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
  @Patch(`${API_ROUTES.jobs.base}/${API_ROUTES.jobs.id}`)
  @UseGuards(JwtAuthGuard)
  updateJob(@Param("id") id: string, @Body() dto: UpdateJobDto) {
    return this.jobsService.updateJob(id, dto);
  }
}
