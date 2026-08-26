CREATE TYPE "ChatConversationStatus" AS ENUM ('OPEN', 'CLOSED', 'BLOCKED');
CREATE TYPE "ChatSenderType" AS ENUM ('GUEST', 'TA');

CREATE TABLE "GuestDevice" (
    "id" TEXT NOT NULL,
    "sessionTokenHash" TEXT,
    "recoveryTokenHash" TEXT NOT NULL,
    "sessionExpiresAt" TIMESTAMP(3),
    "recoveryExpiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GuestDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "guestDeviceId" TEXT NOT NULL,
    "taUserId" TEXT NOT NULL DEFAULT 'hr-admin',
    "candidateId" TEXT,
    "applicationId" TEXT,
    "status" "ChatConversationStatus" NOT NULL DEFAULT 'OPEN',
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderType" "ChatSenderType" NOT NULL,
    "senderUserId" TEXT,
    "content" TEXT NOT NULL,
    "clientMessageId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GuestDevice_sessionTokenHash_key" ON "GuestDevice"("sessionTokenHash");
CREATE UNIQUE INDEX "GuestDevice_recoveryTokenHash_key" ON "GuestDevice"("recoveryTokenHash");
CREATE INDEX "GuestDevice_sessionExpiresAt_idx" ON "GuestDevice"("sessionExpiresAt");
CREATE INDEX "GuestDevice_recoveryExpiresAt_idx" ON "GuestDevice"("recoveryExpiresAt");
CREATE UNIQUE INDEX "ChatConversation_guestDeviceId_taUserId_key" ON "ChatConversation"("guestDeviceId", "taUserId");
CREATE INDEX "ChatConversation_taUserId_status_lastMessageAt_idx" ON "ChatConversation"("taUserId", "status", "lastMessageAt");
CREATE INDEX "ChatConversation_candidateId_idx" ON "ChatConversation"("candidateId");
CREATE INDEX "ChatConversation_applicationId_idx" ON "ChatConversation"("applicationId");
CREATE UNIQUE INDEX "ChatMessage_conversationId_clientMessageId_key" ON "ChatMessage"("conversationId", "clientMessageId");
CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");
CREATE INDEX "ChatMessage_conversationId_senderType_readAt_idx" ON "ChatMessage"("conversationId", "senderType", "readAt");

ALTER TABLE "ChatConversation"
ADD CONSTRAINT "ChatConversation_guestDeviceId_fkey"
FOREIGN KEY ("guestDeviceId") REFERENCES "GuestDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatConversation"
ADD CONSTRAINT "ChatConversation_candidateId_fkey"
FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ChatConversation"
ADD CONSTRAINT "ChatConversation_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ChatMessage"
ADD CONSTRAINT "ChatMessage_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
