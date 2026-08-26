CREATE TYPE "ProductEventName" AS ENUM ('PAGE_VIEWED', 'FEATURE_ACTION_STARTED', 'FEATURE_ACTION_COMPLETED', 'FEATURE_ACTION_FAILED', 'FORM_VALIDATION_FAILED', 'CLIENT_ERROR_OCCURRED', 'APPLICATION_FUNNEL_STEP', 'SEARCH_PERFORMED');
CREATE TYPE "ProductEventCategory" AS ENUM ('NAVIGATION', 'FEATURE', 'VALIDATION', 'ERROR', 'FUNNEL', 'SEARCH');
CREATE TYPE "ProductEventSource" AS ENUM ('WEB', 'API');
CREATE TYPE "ProductEventActorType" AS ENUM ('PUBLIC', 'ADMIN');
CREATE TYPE "ProductEventOutcome" AS ENUM ('NEUTRAL', 'SUCCESS', 'FAILURE');

CREATE TABLE "ProductEvent" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "eventName" "ProductEventName" NOT NULL,
  "category" "ProductEventCategory" NOT NULL,
  "source" "ProductEventSource" NOT NULL,
  "actorType" "ProductEventActorType" NOT NULL,
  "outcome" "ProductEventOutcome" NOT NULL,
  "actorUserId" TEXT,
  "anonymousSessionHash" TEXT,
  "tenantSlug" TEXT,
  "feature" TEXT,
  "action" TEXT,
  "surface" TEXT,
  "routeTemplate" TEXT,
  "errorCode" TEXT,
  "httpStatus" INTEGER,
  "durationMs" INTEGER,
  "requestId" TEXT,
  "release" TEXT,
  "properties" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductEventDailyAggregate" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "actorType" "ProductEventActorType" NOT NULL,
  "eventName" "ProductEventName" NOT NULL,
  "feature" TEXT NOT NULL DEFAULT '',
  "action" TEXT NOT NULL DEFAULT '',
  "outcome" "ProductEventOutcome" NOT NULL,
  "errorCode" TEXT NOT NULL DEFAULT '',
  "eventCount" INTEGER NOT NULL,
  "sessionCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductEventDailyAggregate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductEvent_eventId_key" ON "ProductEvent"("eventId");
CREATE INDEX "ProductEvent_receivedAt_idx" ON "ProductEvent"("receivedAt");
CREATE INDEX "ProductEvent_eventName_receivedAt_idx" ON "ProductEvent"("eventName", "receivedAt");
CREATE INDEX "ProductEvent_feature_receivedAt_idx" ON "ProductEvent"("feature", "receivedAt");
CREATE INDEX "ProductEvent_actorType_receivedAt_idx" ON "ProductEvent"("actorType", "receivedAt");
CREATE INDEX "ProductEvent_outcome_receivedAt_idx" ON "ProductEvent"("outcome", "receivedAt");
CREATE INDEX "ProductEvent_errorCode_receivedAt_idx" ON "ProductEvent"("errorCode", "receivedAt");
CREATE UNIQUE INDEX "ProductEventDailyAggregate_key" ON "ProductEventDailyAggregate"("date", "actorType", "eventName", "feature", "action", "outcome", "errorCode");
CREATE INDEX "ProductEventDailyAggregate_date_idx" ON "ProductEventDailyAggregate"("date");
CREATE INDEX "ProductEventDailyAggregate_feature_date_idx" ON "ProductEventDailyAggregate"("feature", "date");
