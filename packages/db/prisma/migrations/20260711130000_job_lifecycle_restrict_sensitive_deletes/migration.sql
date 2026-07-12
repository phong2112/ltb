ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'CLOSED';

ALTER TABLE "Application" DROP CONSTRAINT "Application_candidateId_fkey";
ALTER TABLE "Application" DROP CONSTRAINT "Application_jobId_fkey";
ALTER TABLE "CandidateFile" DROP CONSTRAINT "CandidateFile_candidateId_fkey";
ALTER TABLE "CandidateFile" DROP CONSTRAINT "CandidateFile_applicationId_fkey";
ALTER TABLE "CvParseResult" DROP CONSTRAINT "CvParseResult_applicationId_fkey";
ALTER TABLE "MatchResult" DROP CONSTRAINT "MatchResult_applicationId_fkey";

ALTER TABLE "Application" ADD CONSTRAINT "Application_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CandidateFile" ADD CONSTRAINT "CandidateFile_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CandidateFile" ADD CONSTRAINT "CandidateFile_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CvParseResult" ADD CONSTRAINT "CvParseResult_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
