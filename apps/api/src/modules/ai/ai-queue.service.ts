import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { type ConnectionOptions, Job, Queue, Worker } from "bullmq";
import { AiService } from "./ai.service";

const CV_EXTRACTION_QUEUE = "cv-extraction";
const CV_EXTRACTION_JOB = "extract-cv" as const;
const AI_MATCH_QUEUE = "ai-cv-match";
const AI_MATCH_JOB = "analyze-application" as const;

type ApplicationProcessingJob = {
  applicationId: string;
};

@Injectable()
export class AiQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiQueueService.name);
  private readonly enabled: boolean;
  private extractionQueue?: Queue<ApplicationProcessingJob, void, typeof CV_EXTRACTION_JOB>;
  private matchQueue?: Queue<ApplicationProcessingJob, void, typeof AI_MATCH_JOB>;
  private extractionWorker?: Worker<ApplicationProcessingJob, void, typeof CV_EXTRACTION_JOB>;
  private matchWorker?: Worker<ApplicationProcessingJob, void, typeof AI_MATCH_JOB>;

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
    const extractionConcurrency = this.configService.get<number>("CV_EXTRACTION_CONCURRENCY") ?? 2;
    const matchConcurrency = this.configService.get<number>("AI_MATCH_CONCURRENCY") ?? 1;

    this.extractionQueue = new Queue(CV_EXTRACTION_QUEUE, { connection });
    this.matchQueue = new Queue(AI_MATCH_QUEUE, { connection });
    this.extractionWorker = new Worker(
      CV_EXTRACTION_QUEUE,
      job => this.processExtractionJob(job),
      { connection, concurrency: extractionConcurrency },
    );
    this.matchWorker = new Worker(
      AI_MATCH_QUEUE,
      job => this.processMatchJob(job),
      { connection, concurrency: matchConcurrency },
    );

    this.extractionWorker.on("completed", job => {
      this.logger.log(`CV extraction completed for application ${job.data.applicationId}`);
    });
    this.extractionWorker.on("failed", job => {
      this.logger.warn(`CV extraction failed for application ${job?.data.applicationId ?? "unknown"}`);
    });
    this.extractionWorker.on("error", () => this.logger.error("CV extraction worker connection error"));
    this.matchWorker.on("completed", job => {
      this.logger.log(`AI match completed for application ${job.data.applicationId}`);
    });
    this.matchWorker.on("failed", job => {
      this.logger.warn(`AI match failed for application ${job?.data.applicationId ?? "unknown"}`);
    });
    this.matchWorker.on("error", () => this.logger.error("AI match worker connection error"));
  }

  async enqueue(applicationId: string) {
    if (!this.enabled) return false;
    if (!this.extractionQueue) throw new Error("CV extraction queue is not ready");

    await this.extractionQueue.add(CV_EXTRACTION_JOB, { applicationId }, {
      ...this.defaultJobOptions(),
      jobId: `extract-${applicationId}`,
    });

    return true;
  }

  async onModuleDestroy() {
    await this.extractionWorker?.close();
    await this.matchWorker?.close();
    await this.extractionQueue?.close();
    await this.matchQueue?.close();
  }

  private async processExtractionJob(
    job: Job<ApplicationProcessingJob, void, typeof CV_EXTRACTION_JOB>,
  ) {
    try {
      await this.aiService.extractApplicationCv(job.data.applicationId);
    } catch (error) {
      if (isFinalAttempt(job)) {
        await this.aiService.markFailed(job.data.applicationId, error, "extraction");
      }
      throw error;
    }

    try {
      await this.enqueueMatch(job.data.applicationId);
    } catch (error) {
      if (isFinalAttempt(job)) {
        await this.aiService.markFailed(job.data.applicationId, error, "queue");
      }
      throw error;
    }
  }

  private async processMatchJob(
    job: Job<ApplicationProcessingJob, void, typeof AI_MATCH_JOB>,
  ) {
    try {
      await this.aiService.analyzeApplication(job.data.applicationId);
    } catch (error) {
      if (isFinalAttempt(job)) {
        await this.aiService.markFailed(job.data.applicationId, error, "analysis");
      }
      throw error;
    }
  }

  private async enqueueMatch(applicationId: string) {
    if (!this.matchQueue) throw new Error("AI match queue is not ready");

    await this.matchQueue.add(AI_MATCH_JOB, { applicationId }, {
      ...this.defaultJobOptions(),
      jobId: `match-${applicationId}`,
    });
  }

  private defaultJobOptions() {
    const attempts = this.configService.get<number>("AI_JOB_ATTEMPTS") ?? 2;

    return {
      attempts,
      backoff: { type: "exponential" as const, delay: 5_000 },
      removeOnComplete: 100,
      removeOnFail: 100,
    };
  }
}

function isFinalAttempt(job: Job<ApplicationProcessingJob>) {
  const attempts = job.opts.attempts ?? 1;
  return job.attemptsMade + 1 >= attempts;
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
