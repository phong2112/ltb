ALTER TABLE "Application" ADD COLUMN "submittedFullName" TEXT;
ALTER TABLE "Application" ADD COLUMN "submittedEmail" TEXT;
ALTER TABLE "Application" ADD COLUMN "submittedPhone" TEXT;
ALTER TABLE "Application" ADD COLUMN "submittedLinkedinUrl" TEXT;
ALTER TABLE "Application" ADD COLUMN "submittedPortfolioUrl" TEXT;
ALTER TABLE "Application" ADD COLUMN "coverNote" TEXT;
ALTER TABLE "Application" ADD COLUMN "hrNotes" TEXT;

WITH application_notes AS (
  SELECT
    application."id",
    NULLIF(COALESCE(application."answers"->>'coverNote', application."answers"->>'text'), '') AS "answerNote",
    NULLIF(candidate."notes", '') AS "candidateNotes"
  FROM "Application" AS application
  JOIN "Candidate" AS candidate ON candidate."id" = application."candidateId"
)
UPDATE "Application" AS application
SET
  "submittedFullName" = candidate."fullName",
  "submittedEmail" = candidate."email",
  "submittedPhone" = candidate."phone",
  "submittedLinkedinUrl" = candidate."linkedinUrl",
  "submittedPortfolioUrl" = candidate."portfolioUrl",
  "coverNote" = COALESCE(application_notes."answerNote", application_notes."candidateNotes"),
  "hrNotes" = CASE
    WHEN application_notes."candidateNotes" IS NOT NULL
      AND application_notes."candidateNotes" IS DISTINCT FROM application_notes."answerNote"
    THEN application_notes."candidateNotes"
    ELSE NULL
  END
FROM "Candidate" AS candidate, application_notes
WHERE candidate."id" = application."candidateId"
  AND application_notes."id" = application."id";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Application" WHERE "submittedFullName" IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce Application.submittedFullName: existing applications could not be backfilled.';
  END IF;
END $$;

ALTER TABLE "Application" ALTER COLUMN "submittedFullName" SET NOT NULL;
ALTER TABLE "Candidate" DROP COLUMN "notes";
