ALTER TABLE "CandidateMessage" ADD COLUMN "applicationId" TEXT;
ALTER TABLE "FollowUpTask" ADD COLUMN "applicationId" TEXT;

WITH single_application AS (
  SELECT "candidateId", MIN("id") AS "applicationId"
  FROM "Application"
  GROUP BY "candidateId"
  HAVING COUNT(*) = 1
)
UPDATE "CandidateMessage" AS message
SET "applicationId" = single_application."applicationId"
FROM single_application
WHERE message."applicationId" IS NULL
  AND message."candidateId" = single_application."candidateId";

WITH single_application AS (
  SELECT "candidateId", MIN("id") AS "applicationId"
  FROM "Application"
  GROUP BY "candidateId"
  HAVING COUNT(*) = 1
)
UPDATE "FollowUpTask" AS task
SET "applicationId" = single_application."applicationId"
FROM single_application
WHERE task."applicationId" IS NULL
  AND task."candidateId" = single_application."candidateId";

INSERT INTO "FollowUpTask" (
  "id",
  "candidateId",
  "applicationId",
  "title",
  "dueAt",
  "createdAt",
  "updatedAt"
)
SELECT
  'followup_' || md5(random()::text || clock_timestamp()::text || application."id"),
  application."candidateId",
  application."id",
  'Follow up ' || application."submittedFullName" || ' for ' || job."title",
  application."followUpAt",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Application" AS application
JOIN "Job" AS job ON job."id" = application."jobId"
WHERE application."followUpAt" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "FollowUpTask" AS existing_task
    WHERE existing_task."applicationId" = application."id"
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "CandidateMessage" WHERE "applicationId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot migrate CandidateMessage.applicationId: some messages belong to candidates with multiple applications. Backfill applicationId manually before re-running this migration.';
  END IF;

  IF EXISTS (SELECT 1 FROM "FollowUpTask" WHERE "applicationId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot migrate FollowUpTask.applicationId: some tasks belong to candidates with multiple applications. Backfill applicationId manually before re-running this migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "FollowUpTask"
    GROUP BY "applicationId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add FollowUpTask(applicationId) unique constraint: duplicate follow-up tasks exist for the same application.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CandidateMessage" AS message
    JOIN "Application" AS application ON application."id" = message."applicationId"
    WHERE message."candidateId" <> application."candidateId"
  ) THEN
    RAISE EXCEPTION 'Cannot migrate CandidateMessage.applicationId: message candidateId does not match application candidateId.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "FollowUpTask" AS task
    JOIN "Application" AS application ON application."id" = task."applicationId"
    WHERE task."candidateId" <> application."candidateId"
  ) THEN
    RAISE EXCEPTION 'Cannot migrate FollowUpTask.applicationId: task candidateId does not match application candidateId.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Candidate"
    WHERE "normalizedEmail" IS NOT NULL
    GROUP BY "normalizedEmail"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add unique Candidate(normalizedEmail): duplicate normalized emails exist.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Candidate"
    WHERE "normalizedPhone" IS NOT NULL
    GROUP BY "normalizedPhone"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add unique Candidate(normalizedPhone): duplicate normalized phones exist.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Application"
    WHERE "normalizedEmail" IS NULL
      AND "normalizedPhone" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot require Application normalized contact: some applications have neither normalizedEmail nor normalizedPhone.';
  END IF;
END $$;

ALTER TABLE "CandidateMessage" ALTER COLUMN "applicationId" SET NOT NULL;
ALTER TABLE "FollowUpTask" ALTER COLUMN "applicationId" SET NOT NULL;

CREATE INDEX "CandidateMessage_applicationId_idx" ON "CandidateMessage"("applicationId");
CREATE UNIQUE INDEX "FollowUpTask_applicationId_key" ON "FollowUpTask"("applicationId");

CREATE UNIQUE INDEX "Candidate_normalizedEmail_unique_not_null"
  ON "Candidate"("normalizedEmail")
  WHERE "normalizedEmail" IS NOT NULL;

CREATE UNIQUE INDEX "Candidate_normalizedPhone_unique_not_null"
  ON "Candidate"("normalizedPhone")
  WHERE "normalizedPhone" IS NOT NULL;

ALTER TABLE "CandidateMessage" ADD CONSTRAINT "CandidateMessage_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Application" ADD CONSTRAINT "Application_normalized_contact_required"
  CHECK ("normalizedEmail" IS NOT NULL OR "normalizedPhone" IS NOT NULL);

ALTER TABLE "Application" DROP COLUMN "followUpAt";
