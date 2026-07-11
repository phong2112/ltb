ALTER TABLE "Candidate" ADD COLUMN "normalizedEmail" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "normalizedPhone" TEXT;
ALTER TABLE "Application" ADD COLUMN "normalizedEmail" TEXT;
ALTER TABLE "Application" ADD COLUMN "normalizedPhone" TEXT;

UPDATE "Candidate"
SET "normalizedEmail" = NULLIF(lower(btrim("email")), '')
WHERE "email" IS NOT NULL;

WITH phone_values AS (
  SELECT
    "id",
    NULLIF(regexp_replace("phone", '\D', '', 'g'), '') AS digits
  FROM "Candidate"
  WHERE "phone" IS NOT NULL
)
UPDATE "Candidate" AS candidate
SET "normalizedPhone" = CASE
  WHEN length(phone_values.digits) = 11 AND phone_values.digits LIKE '84%' THEN '0' || substr(phone_values.digits, 3)
  ELSE phone_values.digits
END
FROM phone_values
WHERE candidate."id" = phone_values."id"
  AND phone_values.digits IS NOT NULL;

UPDATE "Application" AS application
SET
  "normalizedEmail" = candidate."normalizedEmail",
  "normalizedPhone" = candidate."normalizedPhone"
FROM "Candidate" AS candidate
WHERE application."candidateId" = candidate."id";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Application"
    WHERE "normalizedEmail" IS NOT NULL
    GROUP BY "jobId", "normalizedEmail"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add unique Application(jobId, normalizedEmail): duplicate applications exist for the same job/email.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Application"
    WHERE "normalizedPhone" IS NOT NULL
    GROUP BY "jobId", "normalizedPhone"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add unique Application(jobId, normalizedPhone): duplicate applications exist for the same job/phone.';
  END IF;
END $$;

CREATE INDEX "Candidate_normalizedEmail_idx" ON "Candidate"("normalizedEmail");
CREATE INDEX "Candidate_normalizedPhone_idx" ON "Candidate"("normalizedPhone");
CREATE UNIQUE INDEX "Application_jobId_normalizedEmail_key" ON "Application"("jobId", "normalizedEmail");
CREATE UNIQUE INDEX "Application_jobId_normalizedPhone_key" ON "Application"("jobId", "normalizedPhone");
