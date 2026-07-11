-- Add nullable columns first so existing data can be backfilled before enforcing constraints.
ALTER TABLE "CandidateFile" ADD COLUMN "applicationId" TEXT;
ALTER TABLE "CvParseResult" ADD COLUMN "candidateFileId" TEXT;

-- Vercel Blob paths are stored as cv/{candidateId}/{applicationId}/...
-- Blob URLs include that pathname after the host, so this regex works for both forms.
WITH path_application AS (
  SELECT
    cf."id" AS "candidateFileId",
    cf."candidateId",
    (regexp_match(cf."path", '(^|/)cv/[^/]+/([^/]+)/'))[2] AS "applicationId"
  FROM "CandidateFile" AS cf
  WHERE cf."applicationId" IS NULL
    AND cf."path" ~ '(^|/)cv/[^/]+/([^/]+)/'
)
UPDATE "CandidateFile" AS cf
SET "applicationId" = path_application."applicationId"
FROM path_application
WHERE cf."id" = path_application."candidateFileId"
  AND EXISTS (
    SELECT 1
    FROM "Application" AS app
    WHERE app."id" = path_application."applicationId"
      AND app."candidateId" = path_application."candidateId"
  );

-- Local legacy files did not include applicationId in the storage path. Only backfill
-- automatically when the candidate has exactly one application.
WITH single_application AS (
  SELECT "candidateId", MIN("id") AS "applicationId"
  FROM "Application"
  GROUP BY "candidateId"
  HAVING COUNT(*) = 1
)
UPDATE "CandidateFile" AS cf
SET "applicationId" = single_application."applicationId"
FROM single_application
WHERE cf."applicationId" IS NULL
  AND single_application."candidateId" = cf."candidateId";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "CandidateFile" WHERE "applicationId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot migrate CandidateFile.applicationId: some files are ambiguous. Backfill applicationId manually before re-running this migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Application"
    GROUP BY "candidateId", "jobId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add Application(candidateId, jobId) unique constraint: duplicate applications exist. Merge or remove duplicates before re-running this migration.';
  END IF;
END $$;

ALTER TABLE "CandidateFile" ALTER COLUMN "applicationId" SET NOT NULL;

CREATE INDEX "CandidateFile_applicationId_idx" ON "CandidateFile"("applicationId");
CREATE INDEX "CandidateFile_applicationId_kind_idx" ON "CandidateFile"("applicationId", "kind");
CREATE INDEX "CvParseResult_candidateFileId_idx" ON "CvParseResult"("candidateFileId");
CREATE UNIQUE INDEX "Application_candidateId_jobId_key" ON "Application"("candidateId", "jobId");

ALTER TABLE "CandidateFile" ADD CONSTRAINT "CandidateFile_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Link the current parse result to the latest CV file for the same application when available.
UPDATE "CvParseResult" AS cpr
SET "candidateFileId" = (
  SELECT cf."id"
  FROM "CandidateFile" AS cf
  WHERE cf."applicationId" = cpr."applicationId"
    AND cf."kind" = 'CV'
  ORDER BY cf."createdAt" DESC, cf."id" DESC
  LIMIT 1
)
WHERE cpr."candidateFileId" IS NULL;

ALTER TABLE "CvParseResult" ADD CONSTRAINT "CvParseResult_candidateFileId_fkey"
  FOREIGN KEY ("candidateFileId") REFERENCES "CandidateFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
