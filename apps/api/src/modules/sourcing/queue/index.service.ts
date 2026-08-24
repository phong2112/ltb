import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SourcingOrchestrationStatus } from "@prisma/client";
import { type ConnectionOptions, type Job, Queue, Worker } from "bullmq";
import { PrismaService } from "../../prisma";
import { SourcingOrchestrationService } from "../orchestration/index.service";

const SOURCING_ORCHESTRATION_QUEUE = "sourcing-orchestration";
const SOURCING_ORCHESTRATION_JOB = "run-campaign" as const;

type SourcingOrchestrationJob = {
  campaignId: string;
  runId: string;
};

@Injectable()
export class SourcingOrchestrationQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SourcingOrchestrationQueueService.name);
  private queue?: Queue<SourcingOrchestrationJob, void, typeof SOURCING_ORCHESTRATION_JOB>;
  private worker?: Worker<SourcingOrchestrationJob, void, typeof SOURCING_ORCHESTRATION_JOB>;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly orchestrationService: SourcingOrchestrationService,
  ) {}

  onModuleInit() {
    const connection = parseRedisConnection(this.configService.getOrThrow<string>("REDIS_URL"));
    this.queue = new Queue(SOURCING_ORCHESTRATION_QUEUE, { connection });
    this.worker = new Worker(
      SOURCING_ORCHESTRATION_QUEUE,
      job => this.process(job),
      { connection, concurrency: 1 },
    );
    this.worker.on("error", error => {
      this.logger.error(`Sourcing orchestration worker connection error: ${safeErrorMessage(error)}`);
    });
  }

  async enqueue(campaignId: string, runId: string) {
    if (!this.queue) throw new Error("Sourcing orchestration queue is not ready");

    await this.queue.add(
      SOURCING_ORCHESTRATION_JOB,
      { campaignId, runId },
      {
        jobId: `${SOURCING_ORCHESTRATION_JOB}-${campaignId}-${runId}`,
        attempts: 1,
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  private async process(job: Job<SourcingOrchestrationJob, void, typeof SOURCING_ORCHESTRATION_JOB>) {
    const started = await this.prisma.sourcingCampaign.updateMany({
      where: {
        id: job.data.campaignId,
        orchestrationRunId: job.data.runId,
        orchestrationStatus: {
          in: [SourcingOrchestrationStatus.QUEUED, SourcingOrchestrationStatus.RUNNING],
        },
      },
      data: {
        orchestrationStatus: SourcingOrchestrationStatus.RUNNING,
        orchestrationStartedAt: new Date(),
      },
    });
    if (!started.count) return;

    try {
      const campaign = await this.prisma.sourcingCampaign.findFirst({
        where: {
          id: job.data.campaignId,
          orchestrationRunId: job.data.runId,
          orchestrationStatus: SourcingOrchestrationStatus.RUNNING,
        },
        include: { job: true },
      });
      if (!campaign) return;

      const result = await this.orchestrationService.run(
        this.prisma,
        campaign.id,
        campaign.job,
        campaign.discoveryLocationScope,
      );
      const { profiles: _profiles, ...summary } = result;
      await this.prisma.sourcingCampaign.updateMany({
        where: { id: campaign.id, orchestrationRunId: job.data.runId },
        data: {
          orchestrationStatus: result.status === "COMPLETED"
            ? SourcingOrchestrationStatus.COMPLETED
            : SourcingOrchestrationStatus.DEGRADED,
          orchestrationResult: summary,
          orchestrationError: null,
          orchestrationFinishedAt: new Date(),
        },
      });
    } catch (error) {
      const message = safeErrorMessage(error);
      this.logger.error(`Sourcing orchestration failed: campaignId=${job.data.campaignId} runId=${job.data.runId} error=${message}`);
      await this.prisma.sourcingCampaign.updateMany({
        where: { id: job.data.campaignId, orchestrationRunId: job.data.runId },
        data: {
          orchestrationStatus: SourcingOrchestrationStatus.FAILED,
          orchestrationError: "Workflow sourcing không thể hoàn tất. Hãy thử chạy lại.",
          orchestrationFinishedAt: new Date(),
        },
      });
    }
  }
}

function parseRedisConnection(value: string): ConnectionOptions {
  const url = new URL(value);
  const db = url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0;

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: Number.isInteger(db) ? db : 0,
    maxRetriesPerRequest: null,
    ...(url.protocol === "rediss:" ? { tls: {} } : {}),
  };
}

function safeErrorMessage(error: unknown) {
  return (error instanceof Error ? error.message : "Unknown error").slice(0, 300);
}
