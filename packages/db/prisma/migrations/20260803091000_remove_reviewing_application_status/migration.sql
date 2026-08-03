ALTER TYPE "ApplicationStatus" RENAME TO "ApplicationStatus_old";

CREATE TYPE "ApplicationStatus" AS ENUM (
  'NEW',
  'VIEWED',
  'CONTACTED',
  'REPLIED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'TALENT_POOL'
);

ALTER TABLE "Application" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Application"
  ALTER COLUMN "status" TYPE "ApplicationStatus"
  USING (
    CASE
      WHEN "status"::TEXT = 'REVIEWING' THEN 'VIEWED'
      ELSE "status"::TEXT
    END
  )::"ApplicationStatus";

ALTER TABLE "Application" ALTER COLUMN "status" SET DEFAULT 'NEW';

DROP TYPE "ApplicationStatus_old";
