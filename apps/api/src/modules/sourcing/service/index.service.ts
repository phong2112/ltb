import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, SourcingCampaignStatus, SourcingDiscoveryLocationScope, SourcingOrchestrationStatus, SourcingProfileFeedback, SourcingProfileStatus } from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "@/modules/prisma";
import { LinkedinDiscoveryService } from "@/modules/sourcing/discovery/index.service";
import { CreateSourcingCampaignDto } from "@/modules/sourcing/dto/create/index.dto";
import { ImportSourcingProfilesDto } from "@/modules/sourcing/dto/import-linkedin/index.dto";
import { InternalCandidateSuggestionService } from "@/modules/sourcing/internal-suggestions/index.service";
import { SourcingOrchestrationQueueService } from "@/modules/sourcing/queue/index.service";
import {
  buildSourcingCampaignSnapshot,
  prepareSourcingProfileUrl,
  type SourcingImportSource,
  type SourcingJobInput,
} from "@/modules/sourcing/search";

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

  async updateCampaignStatus(id: string, status: SourcingCampaignStatus) {
    const updated = await this.prisma.sourcingCampaign.updateMany({
      where: {
        id,
        ...(status === SourcingCampaignStatus.ACTIVE
          ? {}
          : {
              orchestrationStatus: {
                notIn: [SourcingOrchestrationStatus.QUEUED, SourcingOrchestrationStatus.RUNNING],
              },
            }),
      },
      data: { status },
    });
    if (updated.count) return this.getCampaign(id);

    await this.assertCampaignExists(id);
    throw new BadRequestException("Không thể tạm dừng hoặc đóng khi workflow sourcing đang chạy.");
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
        ...buildSourcingCampaignSnapshot(job),
      },
      include: campaignListInclude,
    });
    return withOrchestration(campaign);
  }

  async importProfiles(campaignId: string, dto: ImportSourcingProfilesDto) {
    await this.assertCampaignExists(campaignId);

    const source = dto.source as SourcingImportSource;
    const preparedByInput = dto.urls.map((profileUrl) => ({
      input: profileUrl.trim(),
      prepared: prepareSourcingProfileUrl(profileUrl, source),
    }));
    const invalidUrls = preparedByInput
      .filter((item) => !item.prepared)
      .map((item) => item.input)
      .filter(Boolean);
    const validUrls = preparedByInput.flatMap(item => item.prepared ? [{ input: item.input, ...item.prepared }] : []);
    const uniqueUrls = [...new Map(validUrls.map((item) => [item.normalizedProfileUrl, item])).values()];

    if (!uniqueUrls.length) {
      throw new BadRequestException("Không có URL hồ sơ hợp lệ để thêm.");
    }

    const normalizedUrls = uniqueUrls.map((item) => item.normalizedProfileUrl);
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
    const profilesToCreate = uniqueUrls.filter((item) => !existingSet.has(item.normalizedProfileUrl));
    const created = await this.prisma.sourcedProfile.createMany({
      data: profilesToCreate.map((item) => ({
        campaignId,
        source: dto.source,
        profileUrl: item.profileUrl,
        normalizedProfileUrl: item.normalizedProfileUrl,
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

  async updateProfileFeedback(campaignId: string, profileId: string, feedback: SourcingProfileFeedback | null) {
    const updated = await this.prisma.sourcedProfile.updateMany({
      where: { id: profileId, campaignId },
      data: {
        feedback,
        feedbackAt: feedback ? new Date() : null,
      },
    });
    if (!updated.count) throw new NotFoundException("Không tìm thấy hồ sơ trong chiến dịch.");

    return this.prisma.sourcedProfile.findUniqueOrThrow({ where: { id: profileId } });
  }

  async getCampaignEvaluation(campaignId: string) {
    await this.assertCampaignExists(campaignId);
    const profiles = await this.prisma.sourcedProfile.findMany({
      where: { campaignId },
      select: { id: true, feedback: true, notes: true },
    });
    return buildCampaignEvaluation(profiles);
  }

  async discoverLinkedinProfiles(campaignId: string) {
    const campaign = await this.prisma.sourcingCampaign.findUnique({
      where: { id: campaignId },
      include: { job: true },
    });
    if (!campaign) throw new NotFoundException("Không tìm thấy chiến dịch sourcing.");
    this.assertAutomaticDiscoveryAllowed(campaign.status);

    await this.refreshCampaignSnapshot(campaign.id, campaign.job);
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
    this.assertAutomaticDiscoveryAllowed(campaign.status);

    await this.refreshCampaignSnapshot(campaign.id, campaign.job);
    return this.internalSuggestionService.suggestAndStore(this.prisma, campaign.id, campaign.job);
  }

  async queueOrchestration(campaignId: string) {
    const campaign = await this.prisma.sourcingCampaign.findUnique({
      where: { id: campaignId },
      select: { id: true, status: true },
    });
    if (!campaign) throw new NotFoundException("Không tìm thấy chiến dịch sourcing.");
    this.assertAutomaticDiscoveryAllowed(campaign.status);
    const runId = randomUUID();
    const queued = await this.prisma.sourcingCampaign.updateMany({
      where: {
        id: campaignId,
        status: SourcingCampaignStatus.ACTIVE,
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
      const currentCampaign = await this.getCampaign(campaignId);
      this.assertAutomaticDiscoveryAllowed(currentCampaign.status);
      return { queued: false, campaign: currentCampaign };
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

  private async refreshCampaignSnapshot(id: string, job: SourcingJobInput) {
    await this.prisma.sourcingCampaign.update({
      where: { id },
      data: buildSourcingCampaignSnapshot(job),
    });
  }

  private assertAutomaticDiscoveryAllowed(status: SourcingCampaignStatus) {
    if (status !== SourcingCampaignStatus.ACTIVE) {
      throw new BadRequestException("Chỉ có thể chạy discovery khi chiến dịch đang hoạt động.");
    }
  }
}

type EvaluationProfile = {
  id: string;
  feedback: SourcingProfileFeedback | null;
  notes: string | null;
};

function buildCampaignEvaluation(profiles: EvaluationProfile[]) {
  const ranked = [...profiles].sort((left, right) => readPotentialScore(right.notes) - readPotentialScore(left.notes));
  const top10 = ranked.slice(0, 10);
  const top10Labeled = top10.filter(profile => profile.feedback !== null);
  const relevantAt10 = top10Labeled.filter(profile => profile.feedback === SourcingProfileFeedback.RELEVANT).length;
  const feedbackCounts = {
    relevant: profiles.filter(profile => profile.feedback === SourcingProfileFeedback.RELEVANT).length,
    maybe: profiles.filter(profile => profile.feedback === SourcingProfileFeedback.MAYBE).length,
    notRelevant: profiles.filter(profile => profile.feedback === SourcingProfileFeedback.NOT_RELEVANT).length,
  };
  const labeledCount = feedbackCounts.relevant + feedbackCounts.maybe + feedbackCounts.notRelevant;

  return {
    totalProfiles: profiles.length,
    labeledCount,
    coverage: profiles.length ? Number((labeledCount / profiles.length).toFixed(3)) : 0,
    feedbackCounts,
    ranking: {
      top10Count: top10.length,
      top10LabeledCount: top10Labeled.length,
      top10RelevantCount: relevantAt10,
      precisionAt10: top10Labeled.length ? Number((relevantAt10 / top10Labeled.length).toFixed(3)) : null,
    },
  };
}

function readPotentialScore(notes: string | null) {
  if (!notes) return -1;
  try {
    const parsed = JSON.parse(notes) as { potentialScore?: unknown };
    return typeof parsed.potentialScore === "number" ? parsed.potentialScore : -1;
  } catch {
    return -1;
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
