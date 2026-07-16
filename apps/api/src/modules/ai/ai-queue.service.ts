import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { type ConnectionOptions, Job, Queue, Worker } from "bullmq";
import { AiService } from "./ai.service";

const AI_MATCH_QUEUE = "ai-cv-match";
const AI_MATCH_JOB = "analyze-application" as const;

type AiMatchJob = {
  applicationId: string;
};

@Injectable()
export class AiQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiQueueService.name);
  private readonly enabled: boolean;
  private queue?: Queue<AiMatchJob, void, typeof AI_MATCH_JOB>;
  private worker?: Worker<AiMatchJob, void, typeof AI_MATCH_JOB>;

  constructor(
    private readonly configService: ConfigService,
    private readonly aiService: AiService,
  ) {
    this.enabled = (configService.get<string>("AI_PROVIDER") ?? "disabled") === "ollama";
  }

  onModuleInit() {
    if (!this.enabled) {
      this.logger.log("AI matching is disabled");
      return;
    }

    const redisUrl = this.configService.getOrThrow<string>("REDIS_URL");
    const connection = parseRedisConnection(redisUrl);
    this.queue = new Queue<AiMatchJob, void, typeof AI_MATCH_JOB>(AI_MATCH_QUEUE, { connection });
    this.worker = new Worker<AiMatchJob, void, typeof AI_MATCH_JOB>(AI_MATCH_QUEUE, (job) => this.processJob(job), {
      connection,
      concurrency: 1,
    });
    this.worker.on("completed", (job) => this.logger.log(`AI match completed for application ${job.data.applicationId}`));
    this.worker.on("failed", (job) => this.logger.warn(`AI match failed for application ${job?.data.applicationId ?? "unknown"}`));
    this.worker.on("error", () => this.logger.error("AI queue worker connection error"));
  }

  async enqueue(applicationId: string) {
    if (!this.enabled) return false;
    if (!this.queue) throw new Error("AI queue is not ready");

    const attempts = this.configService.get<number>("AI_JOB_ATTEMPTS") ?? 2;

    await this.queue.add(AI_MATCH_JOB, { applicationId }, {
      jobId: `match-${applicationId}`,
      attempts,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: 100,
      removeOnFail: 100,
    });

    return true;
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  private async processJob(job: Job<AiMatchJob, void, typeof AI_MATCH_JOB>) {
    try {
      await this.aiService.processApplication(job.data.applicationId);
    } catch (error) {
      const attempts = job.opts.attempts ?? 1;

      if (job.attemptsMade + 1 >= attempts) {
        await this.aiService.markFailed(job.data.applicationId, error);
      }

      throw error;
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
