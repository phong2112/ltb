import type { Candidate } from "@/app/data";
import type { TranslationKey } from "@/app/services/i18n-service";

type Translate = (key: TranslationKey) => string;

export type CvPreviewPanelProps = {
  candidate: Candidate;
  t: Translate;
};

export type CvDocumentPreviewProps = {
  name: string;
  cvUrl: string;
  cvFile?: { originalName: string; mimeType: string; sizeBytes: number } | null;
  t: Translate;
};
