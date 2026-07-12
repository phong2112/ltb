import { Injectable, NotFoundException } from "@nestjs/common";
import { JobStatus, Prisma } from "@prisma/client";
import slugify from "slugify";
import { PrismaService } from "../prisma/prisma.service";
import { CreateJobDto } from "./dto/create-job.dto";
import { UpdateJobDto } from "./dto/update-job.dto";

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  listPublicJobs() {
    return this.prisma.job.findMany({
      where: { status: JobStatus.PUBLISHED },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });
  }

  async getPublicJob(slug: string) {
    const job = await this.prisma.job.findFirst({
      where: { slug, status: JobStatus.PUBLISHED },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });

    if (!job) {
      throw new NotFoundException("Published job not found");
    }

    return job;
  }

  listAdminJobs() {
    return this.prisma.job.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });
  }

  async getAdminJob(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException("Job not found");
    }

    return job;
  }

  async createJob(dto: CreateJobDto) {
    const baseSlug = slugify(dto.title, { lower: true, strict: true, locale: "vi" });
    const slug = await this.createUniqueSlug(baseSlug);

    return this.prisma.job.create({
      data: {
        title: dto.title,
        slug,
        company: dto.company,
        department: dto.department,
        location: dto.location,
        employment: dto.employment,
        level: dto.level,
        salaryRange: dto.salaryRange,
        tags: dto.tags ?? [],
        description: dto.description,
        requirements: dto.requirements,
        benefits: dto.benefits,
        status: dto.status ?? JobStatus.DRAFT,
        urgent: dto.urgent ?? false,
        logo: dto.logo,
      },
    });
  }

  async updateJob(id: string, dto: UpdateJobDto) {
    await this.getAdminJob(id);

    const data: Prisma.JobUpdateInput = {
      title: dto.title,
      company: dto.company,
      department: dto.department,
      location: dto.location,
      employment: dto.employment,
      level: dto.level,
      salaryRange: dto.salaryRange,
      tags: dto.tags,
      description: dto.description,
      requirements: dto.requirements,
      benefits: dto.benefits,
      status: dto.status,
      urgent: dto.urgent,
      logo: dto.logo,
    };

    return this.prisma.job.update({
      where: { id },
      data,
    });
  }

  private async createUniqueSlug(baseSlug: string) {
    let slug = baseSlug || "job";
    let suffix = 1;

    while (await this.prisma.job.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    return slug;
  }
}
