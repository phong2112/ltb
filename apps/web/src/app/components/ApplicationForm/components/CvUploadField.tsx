import type { ChangeEvent, RefObject } from "react";
import { FileText, X } from "lucide-react";
import { cvAcceptAttribute } from "@hr-copilot/shared";
import { Field } from "./Field";
import type { Translate } from "../types";
import { formatFileSize } from "../utils";

type CvUploadFieldProps = {
  cvFile: File | null;
  error?: string;
  fieldId: (name: string) => string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleCvFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  removeCvFile: () => void;
  t: Translate;
};

export function CvUploadField({
  cvFile,
  error,
  fieldId,
  fileInputRef,
  handleCvFileChange,
  removeCvFile,
  t,
}: CvUploadFieldProps) {
  return (
    <Field label={t("apply.cvLabel")} id={fieldId("cv-file")} error={error}>
      <input
        ref={fileInputRef}
        id={fieldId("cv-file")}
        type="file"
        accept={cvAcceptAttribute}
        onClick={(event) => {
          event.currentTarget.value = "";
        }}
        onChange={handleCvFileChange}
        className="peer sr-only"
      />
      <label
        htmlFor={fieldId("cv-file")}
        className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm font-bold transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-primary/20 ${error ? "border-red-300 bg-red-50/50 text-red-700" : "border-border bg-input-background text-primary hover:border-primary hover:bg-pink-50"}`}
      >
        <FileText size={17} />
        {cvFile ? t("apply.replaceFile") : t("apply.uploadFile")}
      </label>

      {cvFile && (
        <div className="mt-2.5 flex items-center justify-between gap-3 rounded-xl border border-primary/15 bg-pink-50/60 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-foreground">{cvFile.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {formatFileSize(cvFile.size)} · {cvFile.type || cvFile.name.split(".").pop()?.toUpperCase()}
            </p>
          </div>
          <button
            type="button"
            onClick={removeCvFile}
            className="flex size-8 flex-none cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-red-100 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
            aria-label={t("apply.removeFile")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      <p id={`${fieldId("cv-file")}-help`} className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
        {t("apply.cvHelp")}
      </p>
    </Field>
  );
}
