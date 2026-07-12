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
import { ACCESS_TOKEN_SECURITY_NAME } from "../../config/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateJobDto } from "./dto/create-job.dto";
import { UpdateJobDto } from "./dto/update-job.dto";
import { JobsService } from "./jobs.service";

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

  @ApiOperation({ summary: "Get a published job by slug" })
  @ApiParam({ name: "slug", example: "frontend-developer" })
  @ApiOkResponse({ description: "Published job detail." })
  @ApiNotFoundResponse({ description: "Published job not found." })
  @Get("jobs/public/:slug")
  getPublicJob(@Param("slug") slug: string) {
    return this.jobsService.getPublicJob(slug);
  }

  @ApiOperation({ summary: "List jobs for the HR workspace" })
  @ApiCookieAuth(ACCESS_TOKEN_SECURITY_NAME)
  @ApiOkResponse({ description: "All jobs ordered by newest first." })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token." })
  @Get("admin/jobs")
  @UseGuards(JwtAuthGuard)
  listAdminJobs() {
    return this.jobsService.listAdminJobs();
  }

  @ApiOperation({ summary: "Get a job for HR editing" })
  @ApiCookieAuth(ACCESS_TOKEN_SECURITY_NAME)
  @ApiParam({ name: "id", example: "cmjob123" })
  @ApiOkResponse({ description: "Job detail for the HR workspace." })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token." })
  @ApiNotFoundResponse({ description: "Job not found." })
  @Get("admin/jobs/:id")
  @UseGuards(JwtAuthGuard)
  getAdminJob(@Param("id") id: string) {
    return this.jobsService.getAdminJob(id);
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
