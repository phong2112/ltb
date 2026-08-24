-- Preserve the legacy row when both the old talent-pool identity and the new
-- candidate identity exist. The legacy row may already contain TA decisions.
DELETE FROM "SourcedProfile" AS canonical
USING "SourcedProfile" AS legacy, "TalentPoolEntry" AS entry
WHERE legacy."normalizedProfileUrl" = 'internal://talent-pool/' || entry.id
  AND canonical."campaignId" = legacy."campaignId"
  AND canonical."normalizedProfileUrl" = 'internal://candidate/' || entry."candidateId"
  AND canonical.id <> legacy.id;

UPDATE "SourcedProfile" AS profile
SET "normalizedProfileUrl" = 'internal://candidate/' || entry."candidateId"
FROM "TalentPoolEntry" AS entry
WHERE profile."normalizedProfileUrl" = 'internal://talent-pool/' || entry.id;

-- Internal evidence is derived from private CV data. Keep the scoring reasons
-- and signals, but remove the duplicated excerpt from system-generated notes.
-- Skip malformed legacy notes instead of blocking the whole deployment.
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN
    SELECT id, notes
    FROM "SourcedProfile"
    WHERE "extractionMethod" IN ('talent_pool', 'previous_application', 'search_api_snippet')
      AND notes IS NOT NULL
  LOOP
    BEGIN
      UPDATE "SourcedProfile"
      SET notes = (profile_record.notes::jsonb - 'evidence')::text
      WHERE id = profile_record.id;
    EXCEPTION WHEN invalid_text_representation THEN
      NULL;
    END;
  END LOOP;
END $$;

CREATE TYPE "SourcingProfileFeedback" AS ENUM ('RELEVANT', 'MAYBE', 'NOT_RELEVANT');

ALTER TABLE "SourcedProfile"
  ADD COLUMN "feedback" "SourcingProfileFeedback",
  ADD COLUMN "feedbackAt" TIMESTAMP(3);

CREATE INDEX "SourcedProfile_campaignId_feedback_idx"
  ON "SourcedProfile"("campaignId", "feedback");
