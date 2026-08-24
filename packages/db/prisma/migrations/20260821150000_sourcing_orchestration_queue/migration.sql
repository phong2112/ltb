CREATE TYPE "SourcingOrchestrationStatus" AS ENUM ('IDLE', 'QUEUED', 'RUNNING', 'COMPLETED', 'DEGRADED', 'FAILED');

ALTER TABLE "SourcingCampaign"
  ADD COLUMN "orchestrationStatus" "SourcingOrchestrationStatus" NOT NULL DEFAULT 'IDLE',
  ADD COLUMN "orchestrationRunId" TEXT,
  ADD COLUMN "orchestrationResult" JSONB,
  ADD COLUMN "orchestrationError" TEXT,
  ADD COLUMN "orchestrationStartedAt" TIMESTAMP(3),
  ADD COLUMN "orchestrationFinishedAt" TIMESTAMP(3);

CREATE INDEX "SourcingCampaign_orchestrationStatus_idx" ON "SourcingCampaign"("orchestrationStatus");
