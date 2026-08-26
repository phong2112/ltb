import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ApplicationStatus, CvParseStatus, FileKind, type Prisma } from "@prisma/client";
import { AiQueueService } from "@/modules/ai/queue/index.service";
import { CvStorageService } from "@/modules/files/storage/index.service";
import { PrismaService } from "@/modules/prisma";
import { CreateCandidateMessageDto } from "@/modules/candidates/dto/message/index.dto";
import { UpdateApplicationStatusDto } from "@/modules/candidates/dto/status/index.dto";

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
  private readonly logger = new Logger(CandidatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cvStorageService: CvStorageService,
    private readonly aiQueueService: AiQueueService,
  ) {}

  async listCandidates(status?: ApplicationStatus) {
    const where: Prisma.CandidateWhereInput | undefined = status
      ? {
          applications: {
            some: { status },
          },
        }
      : undefined;

    const candidates = await this.prisma.candidate.findMany({
      where,
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
      cvSummary: readCvSummary(metadata),
      errorMessage: application.cvParseResult.errorMessage,
      confidence: typeof metadata?.confidence === "number" ? metadata.confidence : null,
      analysisSignals: buildAnalysisSignals(metadata),
      updatedAt: application.cvParseResult.updatedAt,
      matchResult: application.matchResult,
    };
  }

  async retryApplicationAnalysis(applicationId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        files: {
          where: { kind: FileKind.CV },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, originalName: true },
        },
      },
    });

    if (!application) {
      throw new NotFoundException("Không tìm thấy hồ sơ ứng tuyển.");
    }

    const cvFile = application.files[0];
    if (!cvFile) {
      throw new BadRequestException("Không thể phân tích AI vì hồ sơ ứng tuyển không có tệp CV.");
    }

    await this.prisma.cvParseResult.upsert({
      where: { applicationId },
      create: {
        applicationId,
        candidateFileId: cvFile.id,
        status: CvParseStatus.PENDING,
        summary: "Hồ sơ đang chờ trích xuất lại nội dung CV.",
        errorMessage: null,
        extractedText: null,
        structuredData: {
          source: "admin_retry_queued",
          cvSource: "uploaded_file",
          fileName: cvFile.originalName,
        },
      },
      update: {
        candidateFileId: cvFile.id,
        status: CvParseStatus.PENDING,
        summary: "Hồ sơ đang chờ trích xuất lại nội dung CV.",
        errorMessage: null,
        extractedText: null,
        structuredData: {
          source: "admin_retry_queued",
          cvSource: "uploaded_file",
          fileName: cvFile.originalName,
        },
      },
    });

    try {
      const queued = await this.aiQueueService.enqueue(applicationId, { force: true });
      if (!queued) {
        await this.markAiRetryUnavailable(applicationId, "AI matching is disabled in this environment");
      }
    } catch (error) {
      this.logger.error(
        error instanceof Error
          ? `Failed to enqueue AI retry: ${error.message}`
          : "Failed to enqueue AI retry",
      );
      await this.markAiRetryUnavailable(applicationId, "AI matching queue is unavailable");
    }

    return this.getApplicationAnalysis(applicationId);
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
        talentPoolEntry: {
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

    // A CandidateFile is owned by exactly one of an application or a talent pool entry.
    const candidateId = file.application?.candidateId ?? file.talentPoolEntry?.candidateId ?? null;

    const openedFile = await this.cvStorageService.openCandidateCv(file.path, file.mimeType);

    await this.prisma.activityLog.create({
      data: {
        candidateId,
        applicationId: file.applicationId,
        candidateFileId: file.id,
        actor: "hr",
        action: "candidate_file_viewed",
        metadata: {
          applicationId: file.applicationId,
          talentPoolEntryId: file.talentPoolEntryId,
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

  private async markAiRetryUnavailable(applicationId: string, errorMessage: string) {
    await this.prisma.cvParseResult.update({
      where: { applicationId },
      data: {
        status: CvParseStatus.FAILED,
        summary: "Không thể bắt đầu phân tích AI. HR vẫn có thể xem CV và đánh giá thủ công.",
        errorMessage,
      },
    });
  }

  async deleteCandidate(id: string) {
    await this.getCandidate(id);

    const filePaths = await this.prisma.$transaction(async tx => {
      const applications = await tx.application.findMany({
        where: { candidateId: id },
        select: {
          id: true,
          files: { select: { path: true } },
        },
      });
      const talentPoolEntries = await tx.talentPoolEntry.findMany({
        where: { candidateId: id },
        select: {
          id: true,
          file: { select: { path: true } },
        },
      });
      const applicationIds = applications.map(application => application.id);
      const talentPoolEntryIds = talentPoolEntries.map(entry => entry.id);
      const paths = [
        ...applications.flatMap(application => application.files.map(file => file.path)),
        ...talentPoolEntries.flatMap(entry => entry.file ? [entry.file.path] : []),
      ];

      await tx.chatConversation.deleteMany({ where: { candidateId: id } });

      if (applicationIds.length > 0) {
        await tx.candidateMessage.deleteMany({ where: { applicationId: { in: applicationIds } } });
        await tx.followUpTask.deleteMany({ where: { applicationId: { in: applicationIds } } });
        await tx.matchResult.deleteMany({ where: { applicationId: { in: applicationIds } } });
        await tx.cvParseResult.deleteMany({ where: { applicationId: { in: applicationIds } } });
        await tx.candidateFile.deleteMany({ where: { applicationId: { in: applicationIds } } });
        await tx.application.deleteMany({ where: { id: { in: applicationIds } } });
      }

      if (talentPoolEntryIds.length > 0) {
        await tx.candidateFile.deleteMany({ where: { talentPoolEntryId: { in: talentPoolEntryIds } } });
        await tx.talentPoolEntry.deleteMany({ where: { id: { in: talentPoolEntryIds } } });
      }

      await tx.candidate.delete({ where: { id } });

      return paths;
    });

    await Promise.allSettled(
      Array.from(new Set(filePaths)).map(path => this.cvStorageService.deleteCandidateCv(path)),
    );

    return { id };
  }
}

function asRecord(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function buildAnalysisSignals(metadata: Record<string, unknown> | undefined) {
  const aiInput = asPlainRecord(metadata?.aiInput);

  return {
    confidence: typeof metadata?.confidence === "number" ? metadata.confidence : null,
    evidenceCoverage: typeof metadata?.evidenceCoverage === "number" ? metadata.evidenceCoverage : null,
    inputTruncated: metadata?.inputTruncated === true,
    lowConfidenceOcr: metadata?.lowConfidenceOcr === true,
    ocrTruncated: metadata?.ocrTruncated === true,
    aiInput: aiInput
      ? {
          selectedCharacters: typeof aiInput.selectedCharacters === "number" ? aiInput.selectedCharacters : null,
          omittedCharacters: typeof aiInput.omittedCharacters === "number" ? aiInput.omittedCharacters : null,
        }
      : null,
  };
}

function readCvSummary(metadata: Record<string, unknown> | undefined) {
  const summary = asPlainRecord(metadata?.cvSummary);
  if (!summary) return null;

  return {
    overview: typeof summary.overview === "string" ? summary.overview : "",
    currentTitle: typeof summary.currentTitle === "string" ? summary.currentTitle : null,
    totalExperience: typeof summary.totalExperience === "string" ? summary.totalExperience : null,
    keySkills: readStringList(summary.keySkills),
    workExperiences: readWorkExperiences(summary.workExperiences),
    workCompanies: readStringList(summary.workCompanies),
    workHighlights: readStringList(summary.workHighlights),
    education: readStringList(summary.education),
    languages: readStringList(summary.languages),
    notesForTa: readStringList(summary.notesForTa),
  };
}

function readWorkExperiences(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      const record = asPlainRecord(item);
      const company = typeof record?.company === "string" ? record.company.trim() : "";
      if (!company) return null;
      return {
        company,
        title: typeof record?.title === "string" && record.title.trim() ? record.title.trim() : null,
        duration: typeof record?.duration === "string" && record.duration.trim() ? record.duration.trim() : null,
      };
    })
    .filter((item): item is { company: string; title: string | null; duration: string | null } => Boolean(item));
}

function readStringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function asPlainRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}
