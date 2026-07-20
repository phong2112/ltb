CREATE TYPE "FileStorageTier" AS ENUM ('PRIMARY', 'ARCHIVE');

ALTER TABLE "CandidateFile"
ADD COLUMN "storageTier" "FileStorageTier" NOT NULL DEFAULT 'PRIMARY',
ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "CandidateFile_storageTier_idx" ON "CandidateFile"("storageTier");
