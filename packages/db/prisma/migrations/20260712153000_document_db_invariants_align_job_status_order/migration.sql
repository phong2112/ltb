-- Keep the database enum order aligned with the Prisma schema order:
-- DRAFT, PUBLISHED, CLOSED, ARCHIVED.
ALTER TABLE "Job" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "JobStatus" RENAME TO "JobStatus_old";
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

ALTER TABLE "Job"
  ALTER COLUMN "status" TYPE "JobStatus"
  USING "status"::TEXT::"JobStatus";

ALTER TABLE "Job" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
DROP TYPE "JobStatus_old";

-- Prisma Client cannot fully model check constraints, so keep this
-- application intake invariant visible in the database catalog.
COMMENT ON CONSTRAINT "Application_normalized_contact_required" ON "Application"
  IS 'Application intake requires at least one normalized contact snapshot: normalizedEmail or normalizedPhone.';

COMMENT ON INDEX "Candidate_normalizedEmail_unique_not_null"
  IS 'Partial unique index: one candidate profile per non-null normalized email.';

COMMENT ON INDEX "Candidate_normalizedPhone_unique_not_null"
  IS 'Partial unique index: one candidate profile per non-null normalized phone.';
