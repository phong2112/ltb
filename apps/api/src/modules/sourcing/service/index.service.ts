import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, SourcingDiscoveryLocationScope, SourcingOrchestrationStatus, SourcingProfileStatus } from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma";
import { LinkedinDiscoveryService } from "../discovery/index.service";
import { CreateSourcingCampaignDto } from "../dto/create/index.dto";
import { ImportSourcingProfilesDto } from "../dto/import-linkedin/index.dto";
import { InternalCandidateSuggestionService } from "../internal-suggestions/index.service";
import { SourcingOrchestrationQueueService } from "../queue/index.service";
import {
  buildSourcingQueries,
  buildSourcingBrief,
  normalizeSourcingProfileUrl,
  type SourcingImportSource,
} from "../search";

const campaignListInclude = {
  job: {
    select: {
      id: true,
      title: true,
      company: true,
      status: true,
      locations: true,
    },
  },
  _count: { select: { profiles: true } },
};

type CampaignRunFields = {
  orchestrationStatus: SourcingOrchestrationStatus;
  orchestrationRunId: string | null;
  orchestrationResult: Prisma.JsonValue | null;
  orchestrationError: string | null;
  orchestrationStartedAt: Date | null;
  orchestrationFinishedAt: Date | null;
};

function discoveryLocationScope(value: string | undefined) {
  return value === "GLOBAL" ? SourcingDiscoveryLocationScope.GLOBAL : SourcingDiscoveryLocationScope.VIETNAM;
}

@Injectable()
export class SourcingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly linkedinDiscoveryService: LinkedinDiscoveryService,
    private readonly internalSuggestionService: InternalCandidateSuggestionService,
    private readonly orchestrationQueueService: SourcingOrchestrationQueueService,
  ) {}

  async listCampaigns() {
    const campaigns = await this.prisma.sourcingCampaign.findMany({
      orderBy: { createdAt: "desc" },
      include: campaignListInclude,
    });
    return campaigns.map(campaign => withOrchestration(campaign));
  }

  async getCampaign(id: string) {
    const campaign = await this.prisma.sourcingCampaign.findUnique({
      where: { id },
      include: {
        job: true,
        profiles: { orderBy: { createdAt: "desc" } },
        _count: { select: { profiles: true } },
      },
    });

    if (!campaign) throw new NotFoundException("Không tìm thấy chiến dịch sourcing.");
    return withOrchestration(campaign);
  }

  async createCampaign(dto: CreateSourcingCampaignDto) {
    const job = await this.prisma.job.findUnique({ where: { id: dto.jobId } });
    if (!job) throw new NotFoundException("Không tìm thấy vị trí tuyển dụng.");

    const name = dto.name?.trim() || `Sourcing · ${job.title}`;
    const campaign = await this.prisma.sourcingCampaign.create({
      data: {
        jobId: job.id,
        name,
        discoveryLocationScope: discoveryLocationScope(dto.discoveryLocationScope),
        brief: buildSourcingBrief(job),
        searchQueries: buildSourcingQueries(job),
      },
      include: campaignListInclude,
    });
    return withOrchestration(campaign);
  }

  async importProfiles(campaignId: string, dto: ImportSourcingProfilesDto) {
    await this.assertCampaignExists(campaignId);

    const source = dto.source as SourcingImportSource;
    const normalizedByInput = dto.urls.map((profileUrl) => ({
      input: profileUrl.trim(),
      normalized: normalizeSourcingProfileUrl(profileUrl, source),
    }));
    const invalidUrls = normalizedByInput
      .filter((item) => !item.normalized)
      .map((item) => item.input)
      .filter(Boolean);
    const validUrls = normalizedByInput.filter(
      (item): item is { input: string; normalized: string } => Boolean(item.normalized),
    );
    const uniqueUrls = [...new Map(validUrls.map((item) => [item.normalized, item])).values()];

    if (!uniqueUrls.length) {
      throw new BadRequestException("Không có URL hồ sơ hợp lệ để thêm.");
    }

    const normalizedUrls = uniqueUrls.map((item) => item.normalized);
    const [existingInCampaign, existingInOtherCampaigns] = await Promise.all([
      this.prisma.sourcedProfile.findMany({
        where: { campaignId, normalizedProfileUrl: { in: normalizedUrls } },
        select: { normalizedProfileUrl: true },
      }),
      this.prisma.sourcedProfile.findMany({
        where: {
          campaignId: { not: campaignId },
          source: dto.source,
          normalizedProfileUrl: { in: normalizedUrls },
        },
        distinct: ["normalizedProfileUrl"],
        select: { normalizedProfileUrl: true },
      }),
    ]);
    const existingSet = new Set(existingInCampaign.map((item) => item.normalizedProfileUrl));
    const profilesToCreate = uniqueUrls.filter((item) => !existingSet.has(item.normalized));
    const created = await this.prisma.sourcedProfile.createMany({
      data: profilesToCreate.map((item) => ({
        campaignId,
        source: dto.source,
        profileUrl: item.normalized,
        normalizedProfileUrl: item.normalized,
        extractionMethod: "ta_provided_url",
      })),
      skipDuplicates: true,
    });

    return {
      createdCount: created.count,
      duplicateCount: dto.urls.length - invalidUrls.length - created.count,
      foundInOtherCampaignCount: existingInOtherCampaigns.length,
      invalidUrls,
      profiles: await this.prisma.sourcedProfile.findMany({
        where: { campaignId },
        orderBy: { createdAt: "desc" },
      }),
    };
  }

  async updateProfileStatus(campaignId: string, profileId: string, status: SourcingProfileStatus) {
    const profile = await this.prisma.sourcedProfile.findFirst({
      where: { id: profileId, campaignId },
    });
    if (!profile) throw new NotFoundException("Không tìm thấy hồ sơ trong chiến dịch.");

    return this.prisma.sourcedProfile.update({
      where: { id: profileId },
      data: { status },
    });
  }

  async discoverLinkedinProfiles(campaignId: string) {
    const campaign = await this.prisma.sourcingCampaign.findUnique({
      where: { id: campaignId },
      include: { job: true },
    });
    if (!campaign) throw new NotFoundException("Không tìm thấy chiến dịch sourcing.");

    return this.linkedinDiscoveryService.discoverAndStore(this.prisma, campaign.id, campaign.job, {
      locationScope: campaign.discoveryLocationScope,
    });
  }

  async suggestInternalCandidates(campaignId: string) {
    const campaign = await this.prisma.sourcingCampaign.findUnique({
      where: { id: campaignId },
      include: { job: true },
    });
    if (!campaign) throw new NotFoundException("Không tìm thấy chiến dịch sourcing.");

    return this.internalSuggestionService.suggestAndStore(this.prisma, campaign.id, campaign.job);
  }

  async queueOrchestration(campaignId: string) {
    await this.assertCampaignExists(campaignId);
    const runId = randomUUID();
    const queued = await this.prisma.sourcingCampaign.updateMany({
      where: {
        id: campaignId,
        orchestrationStatus: {
          notIn: [SourcingOrchestrationStatus.QUEUED, SourcingOrchestrationStatus.RUNNING],
        },
      },
      data: {
        orchestrationStatus: SourcingOrchestrationStatus.QUEUED,
        orchestrationRunId: runId,
        orchestrationResult: Prisma.DbNull,
        orchestrationError: null,
        orchestrationStartedAt: null,
        orchestrationFinishedAt: null,
      },
    });

    if (!queued.count) {
      return { queued: false, campaign: await this.getCampaign(campaignId) };
    }

    try {
      await this.orchestrationQueueService.enqueue(campaignId, runId);
    } catch (error) {
      await this.prisma.sourcingCampaign.updateMany({
        where: {
          id: campaignId,
          orchestrationRunId: runId,
          orchestrationStatus: SourcingOrchestrationStatus.QUEUED,
        },
        data: {
          orchestrationStatus: SourcingOrchestrationStatus.FAILED,
          orchestrationError: "Không thể xếp workflow sourcing. Hãy thử chạy lại.",
          orchestrationFinishedAt: new Date(),
        },
      });
      throw error;
    }

    return { queued: true, campaign: await this.getCampaign(campaignId) };
  }

  private async assertCampaignExists(id: string) {
    const campaign = await this.prisma.sourcingCampaign.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!campaign) throw new NotFoundException("Không tìm thấy chiến dịch sourcing.");
  }
}

function withOrchestration<T extends CampaignRunFields>(campaign: T) {
  const {
    orchestrationStatus,
    orchestrationRunId,
    orchestrationResult,
    orchestrationError,
    orchestrationStartedAt,
    orchestrationFinishedAt,
    ...value
  } = campaign;

  return {
    ...value,
    orchestration: {
      status: orchestrationStatus,
      runId: orchestrationRunId,
      result: orchestrationResult,
      error: orchestrationError,
      startedAt: orchestrationStartedAt,
      finishedAt: orchestrationFinishedAt,
    },
  };
}
