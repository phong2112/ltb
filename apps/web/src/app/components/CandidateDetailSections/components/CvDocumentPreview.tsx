import { ExternalLink, FileText } from "lucide-react";
import type { CvDocumentPreviewProps } from "../types";
import { formatFileSize, formatFileType, withPdfPreviewOptions } from "../utils";

export function CvDocumentPreview({
  name,
  cvUrl,
  cvFile,
  t,
}: CvDocumentPreviewProps) {
  const hasCv = Boolean(cvUrl && cvUrl !== "#");
  const mimeType = cvFile?.mimeType ?? "";
  const isPdf = mimeType === "application/pdf" || /\.pdf($|[?#])/i.test(cvUrl);
  const isImage = mimeType === "image/jpeg" || mimeType === "image/png" || /\.(jpe?g|png)($|[?#])/i.test(cvUrl);
  const canPreview = hasCv && (isPdf || isImage || !cvFile);
  const previewUrl = isPdf ? withPdfPreviewOptions(cvUrl) : cvUrl;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_12px_40px_rgba(83,45,58,0.04)] xl:flex xl:h-[calc(100vh-10.5rem)] xl:flex-col">
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            <h2 className="text-base font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              {t("admin.cvPreview")}
            </h2>
          </div>
          <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">
            {cvFile?.originalName ?? "CV / Portfolio"}
          </p>
        </div>
        {hasCv && (
          <a
            href={cvUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("common.openCv")}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-border text-primary transition-colors hover:border-primary/40 hover:bg-secondary"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      {cvFile && (
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-y border-border bg-background/70 px-5 py-3">
          <FileMeta label={t("admin.fileType")} value={formatFileType(mimeType)} />
          <FileMeta label={t("admin.fileSize")} value={formatFileSize(cvFile.sizeBytes)} />
        </div>
      )}

      {canPreview ? (
        <div className="h-[520px] bg-[#f5eee9] xl:min-h-0 xl:flex-1">
          {isImage ? (
            <img src={previewUrl} alt={`${name} CV`} className="h-full w-full object-contain" />
          ) : (
            <iframe title={`${name} CV`} src={previewUrl} className="h-full w-full bg-white" />
          )}
        </div>
      ) : (
        <div className="flex min-h-56 flex-col items-center justify-center border-t border-border bg-background/70 px-8 py-10 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
            <FileText size={22} />
          </div>
          <p className="text-sm font-black text-foreground">{t("admin.cvPreviewUnavailable")}</p>
          <p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">{t("admin.cvPreviewHint")}</p>
          {hasCv && (
            <a
              href={cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex h-9 items-center gap-2 rounded-xl bg-white px-4 text-xs font-bold text-primary shadow-sm ring-1 ring-border transition-all hover:ring-primary/30"
            >
              {t("common.openCv")} <ExternalLink size={13} />
            </a>
          )}
        </div>
      )}
    </section>
  );
}

function FileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
      <span className="ml-2 text-[11px] font-bold text-foreground">{value}</span>
    </div>
  );
}
