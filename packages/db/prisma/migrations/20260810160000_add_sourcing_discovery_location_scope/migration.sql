-- CreateEnum
CREATE TYPE "SourcingDiscoveryLocationScope" AS ENUM ('VIETNAM', 'GLOBAL');

-- AlterTable
ALTER TABLE "SourcingCampaign" ADD COLUMN "discoveryLocationScope" "SourcingDiscoveryLocationScope" NOT NULL DEFAULT 'VIETNAM';

-- CreateIndex
CREATE INDEX "SourcingCampaign_discoveryLocationScope_idx" ON "SourcingCampaign"("discoveryLocationScope");
