import type { Candidate } from "@/app/data";
import type { Language } from "@/app/services/i18n-service";

export type JobApplicantsAsideProps = {
  jobId: string;
};

export type ApplicantListProps = {
  candidates: Candidate[];
  language: Language;
  returnTo: string;
};
