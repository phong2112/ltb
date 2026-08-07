import type { Job } from "@/app/data";
import type { useLanguage } from "@/app/services/i18n-service";

export type ApplicationFormProps = {
  job: Job;
  onSuccess: () => void;
  variant?: "page" | "dialog";
};

export type FormState = {
  name: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  applicationArea: string;
  note: string;
  agreed: boolean;
};

export type TextFieldName = "name" | "email" | "phone" | "linkedinUrl" | "applicationArea" | "note";
export type ScreeningQuestion = Job["questions"][number];
export type FormErrors = Record<string, string>;
export type Translate = ReturnType<typeof useLanguage>["t"];

export type CvPreviewState = {
  status: "idle" | "loading" | "applied" | "empty" | "failed";
  appliedFields: TextFieldName[];
  message?: string;
};
