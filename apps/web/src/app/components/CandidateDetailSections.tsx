import { ExternalLink, FileText } from "lucide-react";
import type { Candidate } from "@/app/data";
import type { TranslationKey } from "@/app/i18n";

export function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-primary">
      {icon}
      <h2 className="truncate text-base font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
        {title}
      </h2>
    </div>
  );
}

export function AnalysisGroup({
  icon,
  title,
  items,
  emptyText,
  tone,
  bulletClass,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  emptyText: string;
  tone: string;
  bulletClass: string;
}) {
  return (
    <div className="p-5">
      <p className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${tone}`}>
        {icon} {title}
      </p>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className="flex gap-2.5 text-xs leading-5 text-foreground">
              <span className={`mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full ${bulletClass}`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs font-semibold text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}

export function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border/80 bg-background/60 p-3.5">
      <dt className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
        {icon} {label}
      </dt>
      <dd className="mt-1.5 break-words text-sm font-bold text-foreground">{value}</dd>
    </div>
  );
}

export function CvPreviewPanel({ candidate, t }: { candidate: Candidate; t: (key: TranslationKey) => string }) {
  const hasCv = Boolean(candidate.cvUrl && candidate.cvUrl !== "#");
  const mimeType = candidate.cvFile?.mimeType ?? "";
  const isPdf = mimeType === "application/pdf" || /\.pdf($|[?#])/i.test(candidate.cvUrl);
  const canPreview = hasCv && (isPdf || !candidate.cvFile);
  const previewUrl = canPreview ? withPdfPreviewOptions(candidate.cvUrl) : candidate.cvUrl;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_12px_40px_rgba(83,45,58,0.04)] xl:flex xl:h-[calc(100vh-9.75rem)] xl:flex-col">
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            <h2 className="text-base font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              {t("admin.cvPreview")}
            </h2>
          </div>
          <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">
            {candidate.cvFile?.originalName ?? "CV / Portfolio"}
          </p>
        </div>
        {hasCv && (
          <a
            href={candidate.cvUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("common.openCv")}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-border text-primary transition-colors hover:border-primary/40 hover:bg-secondary"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      {candidate.cvFile && (
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-y border-border bg-background/70 px-5 py-3">
          <FileMeta label={t("admin.fileType")} value={formatFileType(mimeType)} />
          <FileMeta label={t("admin.fileSize")} value={formatFileSize(candidate.cvFile.sizeBytes)} />
        </div>
      )}

      {canPreview ? (
        <div className="h-[520px] bg-[#f5eee9] xl:min-h-0 xl:flex-1">
          <iframe title={`${candidate.name} CV`} src={previewUrl} className="h-full w-full bg-white" />
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
              href={candidate.cvUrl}
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

export function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map(part => part.charAt(0))
    .join("")
    .toUpperCase();
}

function withPdfPreviewOptions(url: string) {
  const [baseUrl, existingHash = ""] = url.split("#", 2);
  const params = new URLSearchParams(existingHash);
  params.set("pagemode", "none");
  params.set("navpanes", "0");
  params.set("view", "FitH");
  return `${baseUrl}#${params.toString()}`;
}

function FileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
      <span className="ml-2 text-[11px] font-bold text-foreground">{value}</span>
    </div>
  );
}

function formatFileType(mimeType: string) {
  if (!mimeType) return "—";
  return mimeType.split("/").pop()?.toUpperCase() ?? mimeType;
}

function formatFileSize(sizeBytes: number) {
  if (!sizeBytes) return "—";
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
