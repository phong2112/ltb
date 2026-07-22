import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { CvStorageService } from "../files/cv-storage.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCandidateMessageDto } from "./dto/create-candidate-message.dto";
import { UpdateApplicationStatusDto } from "./dto/update-application-status.dto";

const candidateApplicationInclude = {
  messages: {
    orderBy: { createdAt: "asc" },
  },
  followUpTask: true,
  files: {
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      path: true,
    },
  },
  job: true,
  matchResult: {
    select: {
      score: true,
      strengths: true,
      risks: true,
      missingRequirements: true,
      screeningQuestions: true,
    },
  },
  cvParseResult: {
    select: {
      status: true,
      summary: true,
      errorMessage: true,
      structuredData: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.ApplicationInclude;

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
          include: candidateApplicationInclude,
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
          include: candidateApplicationInclude,
        },
        activities: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!candidate) {
      throw new NotFoundException("Không tìm thấy ứng viên.");
    }

    return candidate;
  }

  async getApplicationAnalysis(applicationId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        cvParseResult: {
          select: {
            status: true,
            summary: true,
            errorMessage: true,
            structuredData: true,
            updatedAt: true,
          },
        },
        matchResult: {
          select: {
            score: true,
            strengths: true,
            risks: true,
            missingRequirements: true,
            screeningQuestions: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException("Không tìm thấy hồ sơ ứng tuyển.");
    }

    if (!application.cvParseResult) {
      throw new NotFoundException("Không tìm thấy trạng thái phân tích CV.");
    }

    const metadata = asRecord(application.cvParseResult.structuredData);

    return {
      applicationId: application.id,
      status: application.cvParseResult.status,
      summary: application.cvParseResult.summary,
      errorMessage: application.cvParseResult.errorMessage,
      confidence: typeof metadata?.confidence === "number" ? metadata.confidence : null,
      updatedAt: application.cvParseResult.updatedAt,
      matchResult: application.matchResult,
    };
  }

  async openCandidateFile(fileId: string) {
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
      throw new NotFoundException("Không tìm thấy tệp ứng viên.");
    }

    if (/^https?:\/\//.test(file.path) && !this.cvStorageService.isManagedStoragePath(file.path)) {
      throw new BadRequestException("Liên kết CV bên ngoài cần được mở trực tiếp.");
    }

    const openedFile = await this.cvStorageService.openCandidateCv(file.path, file.mimeType);

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

    return { file, openedFile };
  }

  async createMessageForApplication(applicationId: string, dto: CreateCandidateMessageDto) {
    const content = dto.content.trim();

    if (!content) {
      throw new BadRequestException("Vui lòng nhập nội dung tin nhắn.");
    }

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true, candidateId: true, jobId: true },
    });

    if (!application) {
      throw new NotFoundException("Không tìm thấy hồ sơ ứng tuyển.");
    }

    return this.prisma.$transaction(async tx => {
      const message = await tx.candidateMessage.create({
        data: {
          applicationId: application.id,
          channel: dto.channel,
          direction: "outbound",
          content,
        },
      });

      await tx.activityLog.create({
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
    });
  }

  async createMessageForCandidate(candidateId: string, dto: CreateCandidateMessageDto) {
    const applications = await this.prisma.application.findMany({
      where: { candidateId },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: 2,
    });

    if (applications.length === 0) {
      throw new NotFoundException("Không tìm thấy ứng viên.");
    }

    if (applications.length > 1) {
      throw new BadRequestException("Ứng viên có nhiều hồ sơ ứng tuyển; vui lòng cung cấp ID hồ sơ ứng tuyển.");
    }

    return this.createMessageForApplication(applications[0].id, dto);
  }

  async updateApplication(applicationId: string, dto: UpdateApplicationStatusDto) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: true },
    });

    if (!application) {
      throw new NotFoundException("Không tìm thấy hồ sơ ứng tuyển.");
    }

    const updated = await this.prisma.$transaction(async tx => {
      const updatedApplication = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: dto.status,
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

      await tx.activityLog.create({
        data: {
          candidateId: application.candidateId,
          applicationId,
          jobId: application.jobId,
          actor: "hr",
          action: dto.status === undefined ? "application_details_updated" : "application_status_updated",
          metadata: {
            applicationId,
            ...(dto.status === undefined ? {} : { status: dto.status }),
            noteUpdated: dto.note !== undefined,
            followUpUpdated: dto.followUpAt !== undefined,
          },
        },
      });

      return updatedApplication;
    });

    return updated;
  }
}

function asRecord(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}
