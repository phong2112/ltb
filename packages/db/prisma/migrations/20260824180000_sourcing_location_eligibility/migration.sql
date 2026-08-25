CREATE TYPE "SourcingLocationEligibility" AS ENUM (
  'ELIGIBLE',
  'NEEDS_VERIFICATION',
  'INELIGIBLE',
  'NOT_APPLICABLE'
);

CREATE TYPE "SourcingMatchConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

ALTER TABLE "SourcedProfile"
  ADD COLUMN "locationEligibility" "SourcingLocationEligibility" NOT NULL DEFAULT 'NOT_APPLICABLE',
  ADD COLUMN "locationEvidence" TEXT,
  ADD COLUMN "potentialScore" INTEGER,
  ADD COLUMN "confidence" "SourcingMatchConfidence",
  ADD COLUMN "scoringVersion" TEXT,
  ADD COLUMN "jdFingerprint" TEXT,
  ADD COLUMN "sourceQueryId" TEXT,
  ADD COLUMN "sourceRank" INTEGER;

-- Existing generated LinkedIn rows do not retain public snippets, so their
-- country cannot be reclassified safely. Keep them visible for verification
-- instead of guessing or deleting TA decisions.
UPDATE "SourcedProfile" AS profile
SET "locationEligibility" = 'NEEDS_VERIFICATION'
FROM "SourcingCampaign" AS campaign
WHERE profile."campaignId" = campaign.id
  AND profile."extractionMethod" = 'search_api_snippet'
  AND campaign."discoveryLocationScope" = 'VIETNAM';

-- Backfill typed ranking fields from valid system-generated legacy notes.
-- Malformed human notes are deliberately skipped.
DO $$
DECLARE
  profile_record RECORD;
  payload JSONB;
BEGIN
  FOR profile_record IN
    SELECT id, notes
    FROM "SourcedProfile"
    WHERE "extractionMethod" IN ('talent_pool', 'previous_application', 'search_api_snippet')
      AND notes IS NOT NULL
  LOOP
    BEGIN
      payload := profile_record.notes::jsonb;
      UPDATE "SourcedProfile"
      SET
        "potentialScore" = CASE
          WHEN jsonb_typeof(payload -> 'potentialScore') = 'number'
            THEN (payload ->> 'potentialScore')::INTEGER
          ELSE NULL
        END,
        "confidence" = CASE
          WHEN payload ->> 'confidence' IN ('LOW', 'MEDIUM', 'HIGH')
            THEN (payload ->> 'confidence')::"SourcingMatchConfidence"
          ELSE NULL
        END,
        "scoringVersion" = NULLIF(payload ->> 'scoringVersion', ''),
        "jdFingerprint" = NULLIF(payload ->> 'jdFingerprint', ''),
        "sourceQueryId" = NULLIF(payload ->> 'sourceQueryId', ''),
        "sourceRank" = CASE
          WHEN jsonb_typeof(payload -> 'searchRank') = 'number'
            THEN (payload ->> 'searchRank')::INTEGER
          ELSE NULL
        END
      WHERE id = profile_record.id;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      NULL;
    END;
  END LOOP;
END $$;

CREATE INDEX "SourcedProfile_campaignId_locationEligibility_potentialScore_idx"
  ON "SourcedProfile"("campaignId", "locationEligibility", "potentialScore");
