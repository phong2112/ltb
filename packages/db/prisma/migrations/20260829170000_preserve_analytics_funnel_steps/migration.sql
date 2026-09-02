ALTER TABLE "ProductEventDailyAggregate"
ADD COLUMN "funnelStep" TEXT NOT NULL DEFAULT '';

DROP INDEX "ProductEventDailyAggregate_key";

CREATE UNIQUE INDEX "ProductEventDailyAggregate_key"
ON "ProductEventDailyAggregate"("date", "actorType", "eventName", "feature", "action", "outcome", "errorCode", "funnelStep");
