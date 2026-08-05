-- CreateEnum
CREATE TYPE "SourcingCampaignStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SourcingProfileStatus" AS ENUM ('SOURCED', 'QUALIFIED', 'CONTACT_READY', 'CONTACTED', 'REPLIED', 'INTERESTED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'NOT_A_FIT');

-- CreateEnum
CREATE TYPE "SourcingSource" AS ENUM ('LINKEDIN', 'TALENT_POOL', 'GITHUB', 'PUBLIC_WEB', 'FACEBOOK', 'ITVIEC', 'VIETNAMWORKS', 'ZALO', 'GITLAB', 'STACK_OVERFLOW', 'MANUAL', 'CSV', 'REFERRAL');

-- CreateTable
CREATE TABLE "SourcingCampaign" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SourcingCampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "brief" JSONB NOT NULL,
    "searchQueries" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SourcingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourcedProfile" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "source" "SourcingSource" NOT NULL DEFAULT 'LINKEDIN',
    "profileUrl" TEXT NOT NULL,
    "normalizedProfileUrl" TEXT NOT NULL,
    "displayName" TEXT,
    "headline" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "status" "SourcingProfileStatus" NOT NULL DEFAULT 'SOURCED',
    "extractionMethod" TEXT NOT NULL DEFAULT 'ta_provided_url',
    "fetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SourcedProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SourcingCampaign_jobId_idx" ON "SourcingCampaign"("jobId");
CREATE INDEX "SourcingCampaign_status_idx" ON "SourcingCampaign"("status");
CREATE INDEX "SourcingCampaign_createdAt_idx" ON "SourcingCampaign"("createdAt");
CREATE UNIQUE INDEX "SourcedProfile_campaignId_normalizedProfileUrl_key" ON "SourcedProfile"("campaignId", "normalizedProfileUrl");
CREATE INDEX "SourcedProfile_source_normalizedProfileUrl_idx" ON "SourcedProfile"("source", "normalizedProfileUrl");
CREATE INDEX "SourcedProfile_campaignId_status_idx" ON "SourcedProfile"("campaignId", "status");
CREATE INDEX "SourcedProfile_createdAt_idx" ON "SourcedProfile"("createdAt");

-- AddForeignKey
ALTER TABLE "SourcingCampaign" ADD CONSTRAINT "SourcingCampaign_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SourcedProfile" ADD CONSTRAINT "SourcedProfile_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SourcingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
