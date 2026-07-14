ALTER TABLE "Job" ADD COLUMN "locations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Job"
SET "locations" = CASE
  WHEN "location" IS NULL OR btrim("location") = '' THEN ARRAY[]::TEXT[]
  ELSE ARRAY["location"]
END;

ALTER TABLE "Job" DROP COLUMN "location";
