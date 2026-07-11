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

  listCandidates() {
    return this.prisma.candidate.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        files: {
          orderBy: { createdAt: "desc" },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
        applications: {
          orderBy: { createdAt: "desc" },
          include: {
            job: true,
            matchResult: true,
            cvParseResult: true,
          },
        },
      },
    });
  }

  async getCandidate(id: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id },
      include: {
        files: true,
        messages: {
          orderBy: { createdAt: "asc" },
        },
        followUps: true,
        activities: {
          orderBy: { createdAt: "desc" },
        },
        applications: {
          orderBy: { createdAt: "desc" },
          include: {
            job: true,
            matchResult: true,
            cvParseResult: true,
          },
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
    });

    if (!file) {
      throw new NotFoundException("Candidate file not found");
    }

    if (/^https?:\/\//.test(file.path) && !this.cvStorageService.isManagedStoragePath(file.path)) {
      throw new BadRequestException("External CV links should be opened directly");
    }

    await this.prisma.activityLog.create({
      data: {
        candidateId: file.candidateId,
        actor: "hr",
        action: "candidate_file_viewed",
        metadata: {
          fileId: file.id,
          originalName: file.originalName,
        },
      },
    });

    return file;
  }

  async createMessage(candidateId: string, dto: CreateCandidateMessageDto) {
    const content = dto.content.trim();

    if (!content) {
      throw new BadRequestException("Message content is required");
    }

    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true },
    });

    if (!candidate) {
      throw new NotFoundException("Candidate not found");
    }

    const message = await this.prisma.candidateMessage.create({
      data: {
        candidateId,
        channel: dto.channel,
        direction: "outbound",
        content,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        candidateId,
        actor: "hr",
        action: "candidate_message_sent",
        metadata: {
          messageId: message.id,
          channel: message.channel,
        },
      },
    });

    return message;
  }

  async updateApplication(applicationId: string, dto: UpdateApplicationStatusDto) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { candidate: true },
    });

    if (!application) {
      throw new NotFoundException("Application not found");
    }

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: dto.status as ApplicationStatus,
        followUpAt: dto.followUpAt ? new Date(dto.followUpAt) : undefined,
      },
    });

    if (dto.note) {
      await this.prisma.candidate.update({
        where: { id: application.candidateId },
        data: {
          notes: [application.candidate.notes, dto.note].filter(Boolean).join("\n\n"),
        },
      });
    }

    await this.prisma.activityLog.create({
      data: {
        candidateId: application.candidateId,
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
