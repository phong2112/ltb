DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "CandidateFile" AS file
    JOIN "Application" AS application ON application."id" = file."applicationId"
    WHERE file."candidateId" <> application."candidateId"
  ) THEN
    RAISE EXCEPTION 'Cannot remove CandidateFile.candidateId: some files do not match their application candidate.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CandidateMessage" AS message
    JOIN "Application" AS application ON application."id" = message."applicationId"
    WHERE message."candidateId" <> application."candidateId"
  ) THEN
    RAISE EXCEPTION 'Cannot remove CandidateMessage.candidateId: some messages do not match their application candidate.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "FollowUpTask" AS task
    JOIN "Application" AS application ON application."id" = task."applicationId"
    WHERE task."candidateId" <> application."candidateId"
  ) THEN
    RAISE EXCEPTION 'Cannot remove FollowUpTask.candidateId: some tasks do not match their application candidate.';
  END IF;
END $$;

ALTER TABLE "CandidateFile" DROP CONSTRAINT IF EXISTS "CandidateFile_candidateId_fkey";
ALTER TABLE "CandidateMessage" DROP CONSTRAINT IF EXISTS "CandidateMessage_candidateId_fkey";
ALTER TABLE "FollowUpTask" DROP CONSTRAINT IF EXISTS "FollowUpTask_candidateId_fkey";

DROP INDEX IF EXISTS "CandidateFile_candidateId_idx";
DROP INDEX IF EXISTS "CandidateMessage_candidateId_idx";
DROP INDEX IF EXISTS "FollowUpTask_candidateId_idx";

ALTER TABLE "CandidateFile" DROP COLUMN "candidateId";
ALTER TABLE "CandidateMessage" DROP COLUMN "candidateId";
ALTER TABLE "FollowUpTask" DROP COLUMN "candidateId";
