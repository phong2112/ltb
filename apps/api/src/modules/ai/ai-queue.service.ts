import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { type ConnectionOptions, Job, Queue, Worker } from "bullmq";
import { QuotaExceededError } from "./groq-ai.provider";
import { AiService } from "./ai.service";
import { TalentPoolProcessingService } from "./talent-pool-processing.service";

const CV_EXTRACTION_QUEUE = "cv-extraction";
const CV_EXTRACTION_JOB = "extract-cv" as const;
const AI_MATCH_QUEUE = "ai-cv-match";
const AI_MATCH_JOB = "analyze-application" as const;
const TALENT_POOL_EXTRACTION_QUEUE = "talent-pool-extraction";
const TALENT_POOL_EXTRACTION_JOB = "extract-pool" as const;

type ApplicationProcessingJob = {
  applicationId: string;
  runId?: string;
};

type TalentPoolProcessingJob = {
  talentPoolEntryId: string;
  targetJobId?: string;
};

type QueueName = typeof CV_EXTRACTION_QUEUE | typeof AI_MATCH_QUEUE | typeof TALENT_POOL_EXTRACTION_QUEUE;
type QueueCounters = { completed: number; failed: number };
type FailureStage = "extraction" | "analysis" | "queue";

export type AiQueueMetrics = {
  enabled: boolean;
  queues: Record<QueueName, QueueCounters>;
};

@Injectable()
export class AiQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiQueueService.name);
  private readonly enabled: boolean;
  private extractionQueue?: Queue<ApplicationProcessingJob, void, typeof CV_EXTRACTION_JOB>;
  private matchQueue?: Queue<ApplicationProcessingJob, void, typeof AI_MATCH_JOB>;
  private poolExtractionQueue?: Queue<TalentPoolProcessingJob, void, typeof TALENT_POOL_EXTRACTION_JOB>;
  private extractionWorker?: Worker<ApplicationProcessingJob, void, typeof CV_EXTRACTION_JOB>;
  private matchWorker?: Worker<ApplicationProcessingJob, void, typeof AI_MATCH_JOB>;
  private poolExtractionWorker?: Worker<TalentPoolProcessingJob, void, typeof TALENT_POOL_EXTRACTION_JOB>;
  private readonly metrics: AiQueueMetrics;

  constructor(
    private readonly configService: ConfigService,
    private readonly aiService: AiService,
    private readonly poolProcessingService: TalentPoolProcessingService,
  ) {
    this.enabled = (configService.get<string>("AI_PROVIDER") ?? "disabled") === "groq";
    this.metrics = {
      enabled: this.enabled,
      queues: {
        [CV_EXTRACTION_QUEUE]: { completed: 0, failed: 0 },
        [AI_MATCH_QUEUE]: { completed: 0, failed: 0 },
        [TALENT_POOL_EXTRACTION_QUEUE]: { completed: 0, failed: 0 },
      },
    };
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
    const poolExtractionConcurrency = this.configService.get<number>("POOL_EXTRACTION_CONCURRENCY") ?? 2;

    this.extractionQueue = new Queue(CV_EXTRACTION_QUEUE, { connection });
    this.matchQueue = new Queue(AI_MATCH_QUEUE, { connection });
    this.poolExtractionQueue = new Queue(TALENT_POOL_EXTRACTION_QUEUE, { connection });
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
    this.poolExtractionWorker = new Worker(
      TALENT_POOL_EXTRACTION_QUEUE,
      job => this.processPoolExtractionJob(job),
      { connection, concurrency: poolExtractionConcurrency },
    );

    this.extractionWorker.on("completed", job => {
      this.recordCompleted(CV_EXTRACTION_QUEUE);
      this.logger.log(`CV extraction completed for application ${job.data.applicationId}`);
    });
    this.extractionWorker.on("failed", (job, error) => {
      this.recordFailed(
        CV_EXTRACTION_QUEUE,
        getFailureStage(error, "extraction"),
        job,
        error,
      );
    });
    this.extractionWorker.on("error", () => this.logger.error("CV extraction worker connection error"));
    this.matchWorker.on("completed", job => {
      this.recordCompleted(AI_MATCH_QUEUE);
      this.logger.log(`AI match completed for application ${job.data.applicationId}`);
    });
    this.matchWorker.on("failed", (job, error) => {
      this.recordFailed(
        AI_MATCH_QUEUE,
        getFailureStage(error, "analysis"),
        job,
        error,
      );
    });
    this.matchWorker.on("error", () => this.logger.error("AI match worker connection error"));
    this.poolExtractionWorker.on("completed", job => {
      this.recordCompleted(TALENT_POOL_EXTRACTION_QUEUE);
      this.logger.log(`Talent pool extraction completed for entry ${job.data.talentPoolEntryId}`);
    });
    this.poolExtractionWorker.on("failed", (job, error) => {
      this.recordFailed(TALENT_POOL_EXTRACTION_QUEUE, "extraction", job, error);
    });
    this.poolExtractionWorker.on("error", () => this.logger.error("Talent pool extraction worker connection error"));
  }

  async enqueue(applicationId: string, options: { force?: boolean } = {}) {
    if (!this.enabled) return false;
    if (!this.extractionQueue) throw new Error("CV extraction queue is not ready");

    const runId = options.force ? createRunId() : undefined;

    await this.extractionQueue.add(CV_EXTRACTION_JOB, { applicationId, runId }, {
      ...this.defaultJobOptions(),
      jobId: formatJobId("extract", applicationId, runId),
    });

    return true;
  }

  async enqueuePoolEntry(talentPoolEntryId: string, targetJobId?: string) {
    if (!this.enabled) return false;
    if (!this.poolExtractionQueue) throw new Error("Talent pool extraction queue is not ready");

    await this.poolExtractionQueue.add(TALENT_POOL_EXTRACTION_JOB, { talentPoolEntryId, targetJobId }, {
      ...this.defaultJobOptions(),
      jobId: `${TALENT_POOL_EXTRACTION_JOB}-${talentPoolEntryId}`,
    });
    return true;
  }

  getMetrics(): AiQueueMetrics {
    return {
      enabled: this.metrics.enabled,
      queues: {
        [CV_EXTRACTION_QUEUE]: { ...this.metrics.queues[CV_EXTRACTION_QUEUE] },
        [AI_MATCH_QUEUE]: { ...this.metrics.queues[AI_MATCH_QUEUE] },
        [TALENT_POOL_EXTRACTION_QUEUE]: { ...this.metrics.queues[TALENT_POOL_EXTRACTION_QUEUE] },
      },
    };
  }

  async onModuleDestroy() {
    await this.extractionWorker?.close();
    await this.matchWorker?.close();
    await this.poolExtractionWorker?.close();
    await this.extractionQueue?.close();
    await this.matchQueue?.close();
    await this.poolExtractionQueue?.close();
  }

  private async processExtractionJob(
    job: Job<ApplicationProcessingJob, void, typeof CV_EXTRACTION_JOB>,
  ) {
    try {
      await this.aiService.extractApplicationCv(job.data.applicationId);
    } catch (error) {
      if (this.isQuotaError(error)) {
        this.logger.warn(`Quota exceeded, re-enqueue extraction for application ${job.data.applicationId}`);
        await this.reEnqueueWithDelay(this.extractionQueue!, job, error);
        return;
      }
      if (isFinalAttempt(job)) {
        await this.aiService.markFailed(job.data.applicationId, error, "extraction");
      }
      throw error;
    }

    try {
      await this.enqueueMatch(job.data.applicationId, job.data.runId);
    } catch (error) {
      if (isFinalAttempt(job)) {
        await this.aiService.markFailed(job.data.applicationId, error, "queue");
      }
      throw new AiQueueStageError("queue", error);
    }
  }

  private async processMatchJob(
    job: Job<ApplicationProcessingJob, void, typeof AI_MATCH_JOB>,
  ) {
    try {
      await this.aiService.analyzeApplication(job.data.applicationId);
    } catch (error) {
      if (this.isQuotaError(error)) {
        this.logger.warn(`Quota exceeded, re-enqueue match for application ${job.data.applicationId}`);
        await this.reEnqueueWithDelay(this.matchQueue!, job, error);
        return;
      }
      if (isFinalAttempt(job)) {
        await this.aiService.markFailed(job.data.applicationId, error, "analysis");
      }
      throw error;
    }
  }

  private async processPoolExtractionJob(
    job: Job<TalentPoolProcessingJob, void, typeof TALENT_POOL_EXTRACTION_JOB>,
  ) {
    try {
      await this.poolProcessingService.processPoolEntry(job.data.talentPoolEntryId);
    } catch (error) {
      if (isFinalAttempt(job)) {
        await this.poolProcessingService.markPoolFailed(job.data.talentPoolEntryId, error);
      }
      throw error;
    }

    if (job.data.targetJobId) {
      const promoted = await this.poolProcessingService.promotePoolEntry(
        job.data.talentPoolEntryId,
        job.data.targetJobId,
        true,
      );
      await this.enqueue(promoted.applicationId);
    }
  }

  private async reEnqueueWithDelay(
    queue: Queue,
    job: Job,
    error: unknown,
  ) {
    const quotaError = this.asQuotaError(error);
    const delayMs = quotaError ? Math.min(quotaError.retryAfterMs, 300_000) : 30_000;

    await queue.add(
      job.name,
      job.data,
      {
        ...this.defaultJobOptions(),
        delay: delayMs + jitterMs(),
        jobId: job.id,
      },
    );
  }

  private isQuotaError(error: unknown): boolean {
    return this.asQuotaError(error) !== null;
  }

  private asQuotaError(error: unknown): QuotaExceededError | null {
    if (error instanceof QuotaExceededError) return error;

    if (error && typeof error === "object") {
      const record = error as Record<string, unknown>;
      const cause = record.cause;
      if (cause instanceof QuotaExceededError) return cause;
    }

    return null;
  }

  private async enqueueMatch(applicationId: string, runId?: string) {
    if (!this.matchQueue) throw new Error("AI match queue is not ready");

    await this.matchQueue.add(AI_MATCH_JOB, { applicationId, runId }, {
      ...this.defaultJobOptions(),
      jobId: formatJobId("match", applicationId, runId),
    });
  }

  private defaultJobOptions() {
    const attempts = this.configService.get<number>("AI_JOB_ATTEMPTS") ?? 6;

    return {
      attempts,
      backoff: { type: "exponential" as const, delay: 5_000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    };
  }

  private recordCompleted(queue: QueueName) {
    this.metrics.queues[queue].completed += 1;
  }

  private recordFailed(
    queue: QueueName,
    stage: FailureStage,
    job: Job<ApplicationProcessingJob | TalentPoolProcessingJob> | undefined,
    error: Error,
  ) {
    if (job && !hasExhaustedAttempts(job)) {
      this.logger.warn(
        `AI job will retry: queue=${queue} jobId=${job.id ?? "unknown"} ${getJobSubjectLabel(job.data)}=${getJobSubjectId(job.data)} attemptsMade=${job.attemptsMade}`,
      );
      return;
    }

    this.metrics.queues[queue].failed += 1;
    const subject = job ? getJobSubject(job.data) : { applicationId: "unknown" };
    this.logger.error(`AI_JOB_FAILED ${JSON.stringify({
      queue,
      jobId: job?.id ?? "unknown",
      ...subject,
      stage,
      attemptsMade: job?.attemptsMade ?? 0,
      error: error.message,
    })}`);
  }
}

class AiQueueStageError extends Error {
  readonly stage: FailureStage;

  constructor(stage: FailureStage, cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = "AiQueueStageError";
    this.stage = stage;
  }
}

function isFinalAttempt(job: Job<ApplicationProcessingJob | TalentPoolProcessingJob>) {
  const attempts = job.opts.attempts ?? 1;
  return job.attemptsMade + 1 >= attempts;
}

function hasExhaustedAttempts(job: Job<ApplicationProcessingJob | TalentPoolProcessingJob>) {
  const attempts = job.opts.attempts ?? 1;
  return job.attemptsMade >= attempts;
}

function getJobSubjectId(data: ApplicationProcessingJob | TalentPoolProcessingJob) {
  return "applicationId" in data ? data.applicationId : data.talentPoolEntryId;
}

function getJobSubjectLabel(data: ApplicationProcessingJob | TalentPoolProcessingJob) {
  return "applicationId" in data ? "applicationId" : "talentPoolEntryId";
}

function getJobSubject(data: ApplicationProcessingJob | TalentPoolProcessingJob) {
  return "applicationId" in data
    ? { applicationId: data.applicationId }
    : { talentPoolEntryId: data.talentPoolEntryId };
}

function createRunId() {
  return Date.now().toString(36);
}

function formatJobId(stage: "extract" | "match", applicationId: string, runId?: string) {
  return runId ? `${stage}-${applicationId}-${runId}` : `${stage}-${applicationId}`;
}

function getFailureStage(error: Error, fallback: FailureStage) {
  return error instanceof AiQueueStageError ? error.stage : fallback;
}

function jitterMs(): number {
  return Math.floor(Math.random() * 10_000);
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
