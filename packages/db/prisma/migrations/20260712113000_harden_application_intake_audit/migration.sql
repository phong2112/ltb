CREATE TYPE "CvParseStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

ALTER TABLE "CvParseResult" ADD COLUMN "status_new" "CvParseStatus" NOT NULL DEFAULT 'PENDING';

UPDATE "CvParseResult"
SET "status_new" = CASE lower("status")
  WHEN 'completed' THEN 'COMPLETED'::"CvParseStatus"
  WHEN 'failed' THEN 'FAILED'::"CvParseStatus"
  ELSE 'PENDING'::"CvParseStatus"
END;

ALTER TABLE "CvParseResult" DROP COLUMN "status";
ALTER TABLE "CvParseResult" RENAME COLUMN "status_new" TO "status";

ALTER TABLE "ActivityLog" ADD COLUMN "applicationId" TEXT;
ALTER TABLE "ActivityLog" ADD COLUMN "jobId" TEXT;
ALTER TABLE "ActivityLog" ADD COLUMN "candidateFileId" TEXT;

UPDATE "ActivityLog" AS activity
SET "applicationId" = activity."metadata"->>'applicationId'
WHERE activity."metadata" ? 'applicationId'
  AND EXISTS (
    SELECT 1
    FROM "Application" AS application
    WHERE application."id" = activity."metadata"->>'applicationId'
  );

UPDATE "ActivityLog" AS activity
SET "jobId" = activity."metadata"->>'jobId'
WHERE activity."metadata" ? 'jobId'
  AND EXISTS (
    SELECT 1
    FROM "Job" AS job
    WHERE job."id" = activity."metadata"->>'jobId'
  );

UPDATE "ActivityLog" AS activity
SET "candidateFileId" = activity."metadata"->>'fileId'
WHERE activity."metadata" ? 'fileId'
  AND EXISTS (
    SELECT 1
    FROM "CandidateFile" AS candidate_file
    WHERE candidate_file."id" = activity."metadata"->>'fileId'
  );

CREATE INDEX "ActivityLog_applicationId_idx" ON "ActivityLog"("applicationId");
CREATE INDEX "ActivityLog_jobId_idx" ON "ActivityLog"("jobId");
CREATE INDEX "ActivityLog_candidateFileId_idx" ON "ActivityLog"("candidateFileId");

ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_candidateFileId_fkey"
  FOREIGN KEY ("candidateFileId") REFERENCES "CandidateFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
