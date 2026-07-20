import { Injectable, NotFoundException } from "@nestjs/common";
import { JobStatus, Prisma } from "@prisma/client";
import slugify from "slugify";
import { CvStorageLifecycleService } from "../files/cv-storage-lifecycle.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateJobDto } from "./dto/create-job.dto";
import { UpdateJobDto } from "./dto/update-job.dto";

const jobInclude = {
  questions: {
    orderBy: { sortOrder: "asc" as const },
  },
  _count: {
    select: { applications: true },
  },
};

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cvStorageLifecycleService: CvStorageLifecycleService,
  ) {}

  listPublicJobs() {
    return this.prisma.job.findMany({
      where: { status: JobStatus.PUBLISHED },
      orderBy: { createdAt: "desc" },
      include: jobInclude,
    });
  }

  async getPublicJob(slug: string) {
    const job = await this.prisma.job.findFirst({
      where: { slug, status: JobStatus.PUBLISHED },
      include: jobInclude,
    });

    if (!job) {
      throw new NotFoundException("Không tìm thấy vị trí tuyển dụng đã công khai.");
    }

    return job;
  }

  listAdminJobs() {
    return this.prisma.job.findMany({
      orderBy: { createdAt: "desc" },
      include: jobInclude,
    });
  }

  async getAdminJob(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: jobInclude,
    });

    if (!job) {
      throw new NotFoundException("Không tìm thấy vị trí tuyển dụng.");
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
        locations: dto.locations,
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
        questions: dto.questions?.length
          ? {
              create: normalizeQuestions(dto.questions),
            }
          : undefined,
      },
      include: jobInclude,
    });
  }

  async updateJob(id: string, dto: UpdateJobDto) {
    await this.getAdminJob(id);

    const { questions, ...jobDto } = dto;
    const data: Prisma.JobUpdateInput = {
      title: jobDto.title,
      company: jobDto.company,
      department: jobDto.department,
      locations: jobDto.locations,
      employment: jobDto.employment,
      level: jobDto.level,
      salaryRange: jobDto.salaryRange,
      tags: jobDto.tags,
      description: jobDto.description,
      requirements: jobDto.requirements,
      benefits: jobDto.benefits,
      status: jobDto.status,
      urgent: jobDto.urgent,
      logo: jobDto.logo,
    };

    const updatedJob = await this.prisma.$transaction(async (tx) => {
      const job = await tx.job.update({
        where: { id },
        data,
      });

      if (questions !== undefined) {
        await tx.jobQuestion.deleteMany({
          where: { jobId: id },
        });

        if (questions.length > 0) {
          await tx.jobQuestion.createMany({
            data: normalizeQuestions(questions).map((question) => ({
              ...question,
              jobId: id,
            })),
          });
        }
      }

      return tx.job.findUniqueOrThrow({
        where: { id: job.id },
        include: jobInclude,
      });
    });

    if (dto.status === JobStatus.ARCHIVED) {
      await this.cvStorageLifecycleService.archiveJobCandidateFiles(id);
    } else if (dto.status !== undefined) {
      await this.cvStorageLifecycleService.restoreJobCandidateFiles(id);
    }

    return updatedJob;
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

function normalizeQuestions(questions: NonNullable<CreateJobDto["questions"]>) {
  return questions.map((question, index) => ({
    label: question.label.trim(),
    required: question.required ?? false,
    sortOrder: question.sortOrder ?? index,
  }));
}
