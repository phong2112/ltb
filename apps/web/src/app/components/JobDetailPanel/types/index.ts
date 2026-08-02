import type { Job } from "@/app/data";
import type { Language, useLanguage } from "@/app/services/i18n-service";

export type JobDetailPanelProps = {
  job: Job;
  variant?: "panel" | "inline";
};

export type JobDetailSharedProps = {
  job: Job;
  language: Language;
  salary: string;
  t: ReturnType<typeof useLanguage>["t"];
};

