import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ApplicationStatus } from "@prisma/client";
import { CvStorageService } from "../files/cv-storage.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCandidateMessageDto } from "./dto/create-candidate-message.dto";
import { UpdateApplicationStatusDto } from "./dto/update-application-status.dto";

@Injectable()
export class CandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cvStorageService: CvStorageService,
  ) {}

  async listCandidates() {
    const candidates = await this.prisma.candidate.findMany({
      include: {
        applications: {
          orderBy: { createdAt: "desc" },
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
            },
            followUpTask: true,
            files: {
              orderBy: { createdAt: "desc" },
            },
            job: true,
            matchResult: true,
            cvParseResult: true,
          },
        },
      },
    });

    return candidates.sort((left, right) => {
      const leftAppliedAt = left.applications[0]?.createdAt.getTime() ?? 0;
      const rightAppliedAt = right.applications[0]?.createdAt.getTime() ?? 0;
      return rightAppliedAt - leftAppliedAt;
    });
  }

  async getCandidate(id: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id },
      include: {
        applications: {
          orderBy: { createdAt: "desc" },
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
            },
            followUpTask: true,
            files: {
              orderBy: { createdAt: "desc" },
            },
            job: true,
            matchResult: true,
            cvParseResult: true,
          },
        },
        activities: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!candidate) {
      throw new NotFoundException("Candidate not found");
    }

    return candidate;
  }

  async getCandidateFile(fileId: string) {
    const file = await this.prisma.candidateFile.findUnique({
      where: { id: fileId },
      include: {
        application: {
          select: {
            candidateId: true,
          },
        },
      },
    });

    if (!file) {
      throw new NotFoundException("Candidate file not found");
    }

    if (/^https?:\/\//.test(file.path) && !this.cvStorageService.isManagedStoragePath(file.path)) {
      throw new BadRequestException("External CV links should be opened directly");
    }

    await this.prisma.activityLog.create({
      data: {
        candidateId: file.application.candidateId,
        applicationId: file.applicationId,
        candidateFileId: file.id,
        actor: "hr",
        action: "candidate_file_viewed",
        metadata: {
          applicationId: file.applicationId,
          fileId: file.id,
          originalName: file.originalName,
        },
      },
    });

    return file;
  }

  async createMessageForApplication(applicationId: string, dto: CreateCandidateMessageDto) {
    const content = dto.content.trim();

    if (!content) {
      throw new BadRequestException("Message content is required");
    }

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true, candidateId: true, jobId: true },
    });

    if (!application) {
      throw new NotFoundException("Application not found");
    }

    const message = await this.prisma.candidateMessage.create({
      data: {
        applicationId: application.id,
        channel: dto.channel,
        direction: "outbound",
        content,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        candidateId: application.candidateId,
        applicationId: application.id,
        jobId: application.jobId,
        actor: "hr",
        action: "candidate_message_sent",
        metadata: {
          applicationId: application.id,
          messageId: message.id,
          channel: message.channel,
        },
      },
    });

    return message;
  }

  async createMessageForCandidate(candidateId: string, dto: CreateCandidateMessageDto) {
    const applications = await this.prisma.application.findMany({
      where: { candidateId },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: 2,
    });

    if (applications.length === 0) {
      throw new NotFoundException("Candidate not found");
    }

    if (applications.length > 1) {
      throw new BadRequestException("Candidate has multiple applications; applicationId is required");
    }

    return this.createMessageForApplication(applications[0].id, dto);
  }

  async updateApplication(applicationId: string, dto: UpdateApplicationStatusDto) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: true },
    });

    if (!application) {
      throw new NotFoundException("Application not found");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedApplication = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: dto.status as ApplicationStatus,
          hrNotes: dto.note === undefined ? undefined : dto.note.trim() || null,
        },
      });

      if (dto.followUpAt !== undefined) {
        if (dto.followUpAt) {
          await tx.followUpTask.upsert({
            where: { applicationId },
            create: {
              applicationId,
              title: `Follow up ${application.submittedFullName} for ${application.job.title}`,
              dueAt: new Date(dto.followUpAt),
            },
            update: {
              title: `Follow up ${application.submittedFullName} for ${application.job.title}`,
              dueAt: new Date(dto.followUpAt),
              completedAt: null,
            },
          });
        } else {
          await tx.followUpTask.deleteMany({
            where: { applicationId },
          });
        }
      }

      return updatedApplication;
    });

    await this.prisma.activityLog.create({
      data: {
        candidateId: application.candidateId,
        applicationId,
        jobId: application.jobId,
        actor: "hr",
        action: "application_status_updated",
        metadata: {
          applicationId,
          status: dto.status,
          note: dto.note,
          followUpAt: dto.followUpAt,
        },
      },
    });

    return updated;
  }
}
