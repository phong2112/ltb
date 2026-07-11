import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateJobDto } from "./dto/create-job.dto";
import { UpdateJobDto } from "./dto/update-job.dto";
import { JobsService } from "./jobs.service";

@Controller()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get("jobs/public")
  listPublicJobs() {
    return this.jobsService.listPublicJobs();
  }

  @Get("jobs/public/:slug")
  getPublicJob(@Param("slug") slug: string) {
    return this.jobsService.getPublicJob(slug);
  }

  @Get("admin/jobs")
  @UseGuards(JwtAuthGuard)
  listAdminJobs() {
    return this.jobsService.listAdminJobs();
  }

  @Get("admin/jobs/:id")
  @UseGuards(JwtAuthGuard)
  getAdminJob(@Param("id") id: string) {
    return this.jobsService.getAdminJob(id);
  }

  @Post("admin/jobs")
  @UseGuards(JwtAuthGuard)
  createJob(@Body() dto: CreateJobDto) {
    return this.jobsService.createJob(dto);
  }

  @Patch("admin/jobs/:id")
  @UseGuards(JwtAuthGuard)
  updateJob(@Param("id") id: string, @Body() dto: UpdateJobDto) {
    return this.jobsService.updateJob(id, dto);
  }

  @Delete("admin/jobs/:id")
  @UseGuards(JwtAuthGuard)
  deleteJob(@Param("id") id: string) {
    return this.jobsService.deleteJob(id);
  }
}
