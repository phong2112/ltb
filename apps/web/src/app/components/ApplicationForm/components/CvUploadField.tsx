import type { ChangeEvent, RefObject } from "react";
import { FileText, Sparkles, UploadCloud, X } from "lucide-react";
import { cvAcceptAttribute } from "@hr-copilot/shared";
import type { CvPreviewState, Translate } from "@/app/components/ApplicationForm/types";
import { formatFileSize } from "@/app/components/ApplicationForm/utils";

type CvUploadFieldProps = {
  cvFile: File | null;
  cvPreview: CvPreviewState;
  error?: string;
  fieldId: (name: string) => string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleCvFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  removeCvFile: () => void;
  t: Translate;
};

export function CvUploadField({
  cvFile,
  cvPreview,
  error,
  fieldId,
  fileInputRef,
  handleCvFileChange,
  removeCvFile,
  t,
}: CvUploadFieldProps) {
  const inputId = fieldId("cv-file");
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;

  return (
    <div>
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept={cvAcceptAttribute}
        onClick={(event) => {
          event.currentTarget.value = "";
        }}
        onChange={handleCvFileChange}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helpId}
        className="peer sr-only"
      />
      <label
        htmlFor={inputId}
        className={`grid min-h-[76px] cursor-pointer grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 rounded-[14px] border border-dashed px-4 py-3 transition-[background-color,border-color,box-shadow] peer-focus-visible:ring-3 peer-focus-visible:ring-primary/20 ${error ? "border-red-300 bg-red-50/70 text-red-700" : "border-primary/25 bg-white text-foreground shadow-sm hover:border-primary/55 hover:bg-pink-50/35"}`}
      >
        <span className={`flex size-10 items-center justify-center rounded-[10px] ${error ? "bg-red-100 text-red-700" : "bg-pink-50 text-primary"}`}>
          <UploadCloud size={19} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-black">
            {cvFile ? t("apply.replaceFile") : t("apply.uploadFile")}
          </span>
          <span id={helpId} className="mt-0.5 block text-xs font-medium leading-5 text-muted-foreground">
            {t("apply.cvHelp")}
          </span>
        </span>
      </label>

      <p className="mt-2 flex items-start gap-2 rounded-[10px] bg-pink-50/70 px-3 py-2 text-[11px] font-semibold leading-5 text-primary">
        <Sparkles size={14} className="mt-0.5 flex-none" aria-hidden="true" />
        <span>{t("apply.cvAutofillHint")}</span>
      </p>

      {cvFile && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-[10px] border border-border/80 bg-white px-3 py-2 shadow-sm">
          <div className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FileText size={14} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-foreground">{cvFile.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatFileSize(cvFile.size)} · {cvFile.type || cvFile.name.split(".").pop()?.toUpperCase()}
              </p>
            </div>
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
      {cvFile && cvPreview.status !== "idle" && (
        <p className={`mt-1.5 text-[11px] font-semibold leading-4 ${getPreviewToneClassName(cvPreview.status)}`}>
          {getPreviewMessage(cvPreview, t)}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-semibold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function getPreviewMessage(preview: CvPreviewState, t: Translate) {
  if (preview.status === "loading") return t("apply.cvPreviewLoading");
  if (preview.status === "failed") return t("apply.cvPreviewFailed");
  if (preview.status === "empty") return t("apply.cvPreviewEmpty");
  return t("apply.cvPreviewApplied");
}

function getPreviewToneClassName(status: CvPreviewState["status"]) {
  if (status === "failed") return "text-amber-700";
  if (status === "applied") return "text-emerald-700";
  return "text-muted-foreground";
}
