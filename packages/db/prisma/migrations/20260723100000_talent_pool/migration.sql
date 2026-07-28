-- CreateEnum
CREATE TYPE "TalentPoolSource" AS ENUM ('TA_UPLOAD');

-- AlterTable: relax CandidateFile ownership so a file can belong to a talent pool entry.
-- DROP NOT NULL and ADD COLUMN are catalog-only in PostgreSQL (no table rewrite).
ALTER TABLE "CandidateFile" ADD COLUMN     "talentPoolEntryId" TEXT,
ALTER COLUMN "applicationId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "TalentPoolEntry" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" "CvParseStatus" NOT NULL DEFAULT 'PENDING',
    "source" "TalentPoolSource" NOT NULL DEFAULT 'TA_UPLOAD',
    "uploadedByUserId" TEXT,
    "summary" TEXT,
    "structuredData" JSONB,
    "extractedText" TEXT,
    "errorMessage" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "promotedApplicationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TalentPoolEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TalentPoolEntry_promotedApplicationId_key" ON "TalentPoolEntry"("promotedApplicationId");

-- CreateIndex
CREATE INDEX "TalentPoolEntry_candidateId_idx" ON "TalentPoolEntry"("candidateId");

-- CreateIndex
CREATE INDEX "TalentPoolEntry_status_idx" ON "TalentPoolEntry"("status");

-- CreateIndex
CREATE INDEX "TalentPoolEntry_createdAt_idx" ON "TalentPoolEntry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateFile_talentPoolEntryId_key" ON "CandidateFile"("talentPoolEntryId");

-- AddForeignKey
ALTER TABLE "CandidateFile" ADD CONSTRAINT "CandidateFile_talentPoolEntryId_fkey" FOREIGN KEY ("talentPoolEntryId") REFERENCES "TalentPoolEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentPoolEntry" ADD CONSTRAINT "TalentPoolEntry_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentPoolEntry" ADD CONSTRAINT "TalentPoolEntry_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentPoolEntry" ADD CONSTRAINT "TalentPoolEntry_promotedApplicationId_fkey" FOREIGN KEY ("promotedApplicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enforce that a CandidateFile belongs to exactly one owner (an application OR a talent pool entry).
-- Added NOT VALID so PostgreSQL does not take a blocking full-table scan on deploy; every existing
-- row already has a non-null applicationId, so no current row can violate it. Validation runs in the
-- next migration under a lighter lock (SHARE UPDATE EXCLUSIVE).
ALTER TABLE "CandidateFile" ADD CONSTRAINT "CandidateFile_owner_exactly_one"
  CHECK (num_nonnulls("applicationId", "talentPoolEntryId") = 1) NOT VALID;
