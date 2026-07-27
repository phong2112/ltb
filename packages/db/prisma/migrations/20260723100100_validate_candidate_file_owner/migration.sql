-- Validate the owner-exactly-one CHECK added NOT VALID in the previous migration.
-- Runs as a separate migration so it executes in its own transaction and takes only a
-- SHARE UPDATE EXCLUSIVE lock (does not block the live application-intake flow).
ALTER TABLE "CandidateFile" VALIDATE CONSTRAINT "CandidateFile_owner_exactly_one";
