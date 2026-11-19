-- CreateEnum
CREATE TYPE "ChatConversationMode" AS ENUM ('BOT', 'HUMAN');

-- CreateEnum
CREATE TYPE "ChatKnowledgeCategory" AS ENUM ('ABOUT_TA', 'COMPANY_POLICY', 'BENEFITS', 'RECRUITMENT_PROCESS', 'FAQ', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ChatSenderType" ADD VALUE 'BOT';
ALTER TYPE "ChatSenderType" ADD VALUE 'SYSTEM';

-- AlterTable
ALTER TABLE "ChatConversation" ADD COLUMN     "handoffRequestedAt" TIMESTAMP(3),
ADD COLUMN     "mode" "ChatConversationMode" NOT NULL DEFAULT 'BOT',
ADD COLUMN     "taJoinedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ChatKnowledgeEntry" (
    "id" TEXT NOT NULL,
    "category" "ChatKnowledgeCategory" NOT NULL DEFAULT 'FAQ',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatKnowledgeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatKnowledgeEntry_isActive_category_sortOrder_idx" ON "ChatKnowledgeEntry"("isActive", "category", "sortOrder");


-- Conversations that existed before the bot were handled by TA only; keep them with TA
-- so the bot does not start answering mid-conversation. New conversations start with the bot.
UPDATE "ChatConversation" SET "mode" = 'HUMAN', "taJoinedAt" = COALESCE("lastMessageAt", "createdAt");
