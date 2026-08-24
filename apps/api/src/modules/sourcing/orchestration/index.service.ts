import { Injectable, Logger } from "@nestjs/common";
import { SourcingDiscoveryLocationScope } from "@prisma/client";
import type { SourcingPlan } from "@/models/ai";
import type { PrismaService } from "@/modules/prisma";
import { AiModelPortalService } from "@/modules/ai/portal/index.service";
import { SOURCING_PLAN_PROMPT_VERSION } from "@/modules/ai/prompts";
import { LinkedinDiscoveryService } from "@/modules/sourcing/discovery/index.service";
import type { LinkedinDiscoverySummary } from "@/modules/sourcing/discovery/types";
import { InternalCandidateSuggestionService } from "@/modules/sourcing/internal-suggestions/index.service";
import { buildSourcingCampaignSnapshot, type SourcingJobInput } from "@/modules/sourcing/search";

export type SourcingOrchestrationStage = {
  stage: "AI_QUERY_PLANNING" | "INTERNAL_DISCOVERY" | "PUBLIC_WEB_DISCOVERY";
  status: "COMPLETED" | "DEGRADED" | "SKIPPED" | "FAILED";
  message: string;
  createdCount?: number;
  resultCount?: number;
};

export type SourcingOrchestrationResult = {
  status: "COMPLETED" | "DEGRADED";
  strategy: "retrieval_first_human_in_loop";
  aiAssisted: boolean;
  createdCount: number;
  resultCount: number;
  stages: SourcingOrchestrationStage[];
  profiles: unknown[];
};

type InternalSuggestionSummary = {
  createdCount: number;
  resultCount: number;
};

@Injectable()
export class SourcingOrchestrationService {
  private readonly logger = new Logger(SourcingOrchestrationService.name);

  constructor(
    private readonly aiPortal: AiModelPortalService,
    private readonly linkedinDiscovery: LinkedinDiscoveryService,
    private readonly internalSuggestions: InternalCandidateSuggestionService,
  ) {}

  async run(
    prisma: PrismaService,
    campaignId: string,
    job: SourcingJobInput & { id?: string },
    locationScope: SourcingDiscoveryLocationScope,
  ): Promise<SourcingOrchestrationResult> {
    await prisma.sourcingCampaign.update({
      where: { id: campaignId },
      data: buildSourcingCampaignSnapshot(job),
    });
    const internalPromise = this.runInternalDiscovery(prisma, campaignId, job);
    const publicDiscoveryPromise = this.runPublicDiscovery(prisma, campaignId, job, locationScope);
    const [internal, publicDiscovery] = await Promise.all([internalPromise, publicDiscoveryPromise]);
    const stages = [publicDiscovery.aiStage, internal.stage, publicDiscovery.discoveryStage];
    const degraded = stages.some((stage) =>
      stage.status === "DEGRADED" ||
      stage.status === "FAILED" ||
      (stage.stage === "PUBLIC_WEB_DISCOVERY" && stage.status === "SKIPPED")
    );

    return {
      status: degraded ? "DEGRADED" : "COMPLETED",
      strategy: "retrieval_first_human_in_loop",
      aiAssisted: publicDiscovery.aiAssisted,
      createdCount: internal.createdCount + publicDiscovery.createdCount,
      resultCount: internal.resultCount + publicDiscovery.resultCount,
      stages,
      profiles: await prisma.sourcedProfile.findMany({
        where: { campaignId },
        orderBy: { createdAt: "desc" },
      }),
    };
  }

  private async runInternalDiscovery(
    prisma: PrismaService,
    campaignId: string,
    job: SourcingJobInput & { id?: string },
  ) {
    try {
      const result = await this.internalSuggestions.suggestAndStore(prisma, campaignId, job) as InternalSuggestionSummary;
      return {
        createdCount: result.createdCount,
        resultCount: result.resultCount,
        stage: {
          stage: "INTERNAL_DISCOVERY",
          status: "COMPLETED",
          message: `Đã rà nguồn nội bộ và tìm thấy ${result.resultCount} hồ sơ tiềm năng.`,
          createdCount: result.createdCount,
          resultCount: result.resultCount,
        } satisfies SourcingOrchestrationStage,
      };
    } catch (error) {
      this.logStageFailure("INTERNAL_DISCOVERY", error);
      return {
        createdCount: 0,
        resultCount: 0,
        stage: {
          stage: "INTERNAL_DISCOVERY",
          status: "FAILED",
          message: "Không thể rà nguồn nội bộ trong lần chạy này.",
        } satisfies SourcingOrchestrationStage,
      };
    }
  }

  private async runPublicDiscovery(
    prisma: PrismaService,
    campaignId: string,
    job: SourcingJobInput,
    locationScope: SourcingDiscoveryLocationScope,
  ) {
    const planning = await this.planQueries(job);

    try {
      const result = await this.linkedinDiscovery.discoverAndStore(prisma, campaignId, job, {
        locationScope,
        enhancements: planning.plan,
      });
      return {
        aiAssisted: planning.aiAssisted,
        aiStage: planning.stage,
        createdCount: result.createdCount,
        resultCount: result.resultCount,
        discoveryStage: discoveryStage(result),
      };
    } catch (error) {
      this.logStageFailure("PUBLIC_WEB_DISCOVERY", error);
      return {
        aiAssisted: planning.aiAssisted,
        aiStage: planning.stage,
        createdCount: 0,
        resultCount: 0,
        discoveryStage: {
          stage: "PUBLIC_WEB_DISCOVERY",
          status: "FAILED",
          message: "Không thể lưu kết quả public web trong lần chạy này; kết quả nội bộ vẫn được giữ.",
        } satisfies SourcingOrchestrationStage,
      };
    }
  }

  private async planQueries(job: SourcingJobInput) {
    if (!this.aiPortal.groqEnabled) {
      return {
        aiAssisted: false,
        plan: undefined,
        stage: {
          stage: "AI_QUERY_PLANNING",
          status: "SKIPPED",
          message: "AI planner đang tắt; dùng query deterministic từ JD.",
        } satisfies SourcingOrchestrationStage,
      };
    }

    try {
      const plan = sanitizePlan(await this.aiPortal.planSourcing({
        jobTitle: job.title,
        seniority: job.level ?? null,
        locations: job.locations.slice(0, 5),
        skills: job.tags.slice(0, 15),
        requirements: plainText(job.requirements).slice(0, 8_000),
      }));
      return {
        aiAssisted: true,
        plan,
        stage: {
          stage: "AI_QUERY_PLANNING",
          status: "COMPLETED",
          message: `AI planner ${SOURCING_PLAN_PROMPT_VERSION} đã bổ sung ${plan.titleVariants.length} chức danh và ${plan.skillSignals.length} tín hiệu tìm kiếm.`,
        } satisfies SourcingOrchestrationStage,
      };
    } catch (error) {
      this.logStageFailure("AI_QUERY_PLANNING", error);
      return {
        aiAssisted: false,
        plan: undefined,
        stage: {
          stage: "AI_QUERY_PLANNING",
          status: "DEGRADED",
          message: "AI planner không khả dụng; đã fallback sang query deterministic từ JD.",
        } satisfies SourcingOrchestrationStage,
      };
    }
  }

  private logStageFailure(stage: SourcingOrchestrationStage["stage"], error: unknown) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : "Unknown error";
    this.logger.warn(`Sourcing orchestration stage failed: stage=${stage} error=${message.slice(0, 300)}`);
  }
}

function discoveryStage(result: LinkedinDiscoverySummary): SourcingOrchestrationStage {
  if (result.providerStatus === "COMPLETED") {
    return {
      stage: "PUBLIC_WEB_DISCOVERY",
      status: "COMPLETED",
      message: `Brave Search hoàn tất ${result.successfulQueryCount}/${result.queryCount} query.`,
      createdCount: result.createdCount,
      resultCount: result.resultCount,
    };
  }

  const disabled = result.failures.some((failure) => failure.code === "DISABLED" || failure.code === "CONFIGURATION");
  return {
    stage: "PUBLIC_WEB_DISCOVERY",
    status: disabled ? "SKIPPED" : "DEGRADED",
    message: disabled
      ? "Brave Search chưa được cấu hình; workflow vẫn giữ kết quả từ nguồn nội bộ."
      : `Brave Search chạy một phần (${result.successfulQueryCount}/${result.queryCount} query thành công); các kết quả hợp lệ đã được giữ.`,
    createdCount: result.createdCount,
    resultCount: result.resultCount,
  };
}

function sanitizePlan(plan: SourcingPlan): SourcingPlan {
  return {
    titleVariants: uniqueSignals(plan.titleVariants, 8),
    skillSignals: uniqueSignals(plan.skillSignals, 12),
  };
}

function uniqueSignals(values: string[], limit: number) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const cleaned = value.replace(/\s+/gu, " ").trim().slice(0, 80);
    const key = cleaned.toLocaleLowerCase("vi");
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
    if (result.length === limit) break;
  }
  return result;
}

function plainText(value: string) {
  return value
    .replace(/<[^>]*>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}
