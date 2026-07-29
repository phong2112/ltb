import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  FileText,
  Search,
  Tag,
  Upload,
  UsersRound,
  X,
} from "lucide-react";
import ListPagination from "@/app/components/ListPagination";
import AdminLayout from "@/app/layouts/AdminLayout";
import type { ApiJob } from "@/app/data-types";
import { useLanguage } from "@/app/i18n";
import { apiRequest } from "@/app/services/api-client";
import { notificationService } from "@/app/services/notification";
import {
  listTalentPool,
  type TalentPoolListResponse,
  type TalentPoolStatus,
  type TalentPoolUploadResult,
  uploadTalentPoolFiles,
} from "@/app/services/talent-pool-api";

const PAGE_SIZE = 10;
const MAX_FILES = 20;
const MAX_FILE_SIZE_MB = readMaxFileSizeMb();
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);
const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx", "jpg", "jpeg", "png"]);
const STATUS_OPTIONS: Array<TalentPoolStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "EXTRACTING",
  "EXTRACTED",
  "ANALYZING",
  "COMPLETED",
  "FAILED",
];

type ValidationIssue = TalentPoolUploadResult & { status: "error" };

type TalentPoolContentProps = {
  embedded?: boolean;
  showHeader?: boolean;
  onTotalChange?: (total: number) => void;
};

export function TalentPoolContent({ embedded = false, showHeader = true, onTotalChange }: TalentPoolContentProps) {
  const { language, t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [targetJobId, setTargetJobId] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<TalentPoolUploadResult[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tag, setTag] = useState("");
  const [status, setStatus] = useState<TalentPoolStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TalentPoolListResponse>({ total: 0, page: 1, pageSize: PAGE_SIZE, items: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadEntries = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const response = await listTalentPool({
        search,
        tag,
        status: status === "ALL" ? undefined : status,
        page,
        pageSize: PAGE_SIZE,
      });
      setData(response);
      setLoadError("");
    } catch (error) {
      if (!quiet) setLoadError(error instanceof Error ? error.message : t("talentPool.loadError"));
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, [page, search, status, tag, t]);

  useEffect(() => {
    void apiRequest<ApiJob[]>("/admin/jobs").then(setJobs).catch(() => setJobs([]));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setTag(tagInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput, tagInput]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    if (!data.items.some(item => item.status === "PENDING" || item.status === "EXTRACTING")) return;
    const timer = window.setInterval(() => void loadEntries(true), 5_000);
    return () => window.clearInterval(timer);
  }, [data.items, loadEntries]);

  useEffect(() => {
    onTotalChange?.(data.total);
  }, [data.total, onTotalChange]);

  function addFiles(selected: File[]) {
    const issues: ValidationIssue[] = [];
    const accepted: File[] = [];
    const known = new Set(files.map(fileKey));

    for (const file of selected) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ALLOWED_EXTENSIONS.has(extension) || (file.type && !ALLOWED_MIME_TYPES.has(file.type))) {
        issues.push({ fileName: file.name, status: "error", reason: t("talentPool.invalidType") });
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        issues.push({ fileName: file.name, status: "error", reason: `${t("talentPool.fileTooLarge")} ${MAX_FILE_SIZE_MB} MB` });
        continue;
      }
      if (known.has(fileKey(file))) continue;
      if (files.length + accepted.length >= MAX_FILES) {
        issues.push({ fileName: file.name, status: "error", reason: `${t("talentPool.maxFiles")} ${MAX_FILES}` });
        continue;
      }
      known.add(fileKey(file));
      accepted.push(file);
    }

    setFiles(current => [...current, ...accepted]);
    if (issues.length) setUploadResults(issues);
  }

  async function handleUpload() {
    if (!files.length || isUploading) return;
    setIsUploading(true);
    setUploadResults([]);
    const toastId = notificationService.loading(t("talentPool.uploading"));
    try {
      const response = await uploadTalentPoolFiles(files, targetJobId || undefined);
      setUploadResults(response.results);
      const created = response.results.filter(result => result.status === "created").length;
      notificationService.success(`${created} ${t("talentPool.uploadedCount")}`, toastId);
      if (created > 0) {
        setFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await loadEntries(true);
      }
    } catch (error) {
      notificationService.error(error, t("talentPool.uploadError"), toastId);
    } finally {
      setIsUploading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div className={`${embedded ? "w-full" : "mx-auto w-full max-w-[1500px]"} space-y-5`}>
      {showHeader && (
        <header className={embedded ? "flex flex-wrap items-end justify-between gap-3" : undefined}>
          <div>
            <h2 className={`${embedded ? "text-xl" : "text-2xl"} font-black text-foreground`} style={{ fontFamily: "'Playfair Display', serif" }}>{t("talentPool.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{data.total} {t("talentPool.profileCount")}</p>
          </div>
        </header>
      )}

      <section className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-black text-foreground">{t("talentPool.dropTitle")}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              PDF, DOC, DOCX, JPG, PNG · {t("talentPool.upTo")} {MAX_FILE_SIZE_MB} MB · {t("talentPool.maxFiles")} {MAX_FILES}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select id="target-job" value={targetJobId} onChange={event => setTargetJobId(event.target.value)} className="h-9 min-w-52 rounded-lg border border-border bg-input-background px-3 text-xs font-semibold text-muted-foreground outline-none focus:border-primary">
              <option value="">{t("talentPool.keepGeneral")}</option>
              {jobs.filter(job => job.status !== "ARCHIVED").map(job => <option key={job.id} value={job.id}>{job.title}</option>)}
            </select>
            <button type="button" onClick={() => setIsUploadOpen(open => !open)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary/30 bg-white px-3 text-xs font-bold text-primary hover:bg-pink-50">
              <Upload size={14} /> {t("talentPool.chooseFiles")}
            </button>
            <button type="button" disabled={!files.length || isUploading} onClick={() => void handleUpload()} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
              <Upload size={14} /> {isUploading ? t("talentPool.uploading") : `${t("talentPool.uploadButton")} (${files.length})`}
            </button>
          </div>
        </div>

        {(isUploadOpen || files.length > 0 || uploadResults.length > 0) && (
          <div className="border-t border-border">
          <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <div
                onDragEnter={event => { event.preventDefault(); setIsDragging(true); }}
                onDragOver={event => event.preventDefault()}
                onDragLeave={event => { if (event.currentTarget === event.target) setIsDragging(false); }}
                onDrop={event => {
                  event.preventDefault();
                  setIsDragging(false);
                  addFiles(Array.from(event.dataTransfer.files));
                }}
                className={`flex min-h-28 flex-col items-center justify-center border border-dashed px-5 py-4 text-center transition-colors ${isDragging ? "border-primary bg-pink-50" : "border-border bg-background/60"}`}
              >
                <p className="text-sm font-black text-foreground">{t("talentPool.dropTitle")}</p>
                <p className="mt-1 text-xs text-muted-foreground">PDF, DOC, DOCX, JPG, PNG · {t("talentPool.upTo")} {MAX_FILE_SIZE_MB} MB</p>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-primary/30 bg-white px-4 text-xs font-bold text-primary hover:bg-pink-50">
                  <FileText size={14} /> {t("talentPool.chooseFiles")}
                </button>
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="sr-only" onClick={event => { event.currentTarget.value = ""; }} onChange={event => addFiles(Array.from(event.target.files ?? []))} />
              </div>

              {files.length > 0 && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {files.map(file => (
                    <div key={fileKey(file)} className="flex min-w-0 items-center gap-2 rounded-lg border border-border px-3 py-2">
                      <FileText size={14} className="flex-none text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-foreground">{file.name}</p>
                        <p className="text-[11px] text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                      <button type="button" onClick={() => setFiles(current => current.filter(item => fileKey(item) !== fileKey(file)))} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label={t("talentPool.removeFile")}><X size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 border-border lg:border-l lg:pl-4">
              <p className="text-xs leading-5 text-muted-foreground">{t("talentPool.targetJobHint")}</p>
              {isUploading && <div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full w-2/3 animate-pulse rounded-full bg-primary" /></div>}
            </div>
          </div>

          {uploadResults.length > 0 && (
            <div className="border-t border-border bg-background/50 px-5 py-4">
              <p className="mb-2 text-xs font-black uppercase text-muted-foreground">{t("talentPool.uploadResults")}</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {uploadResults.map((result, index) => (
                  <div key={`${result.fileName}-${index}`} className="flex items-start gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-border">
                    {result.status === "created" ? <CheckCircle2 size={15} className="mt-0.5 flex-none text-emerald-600" /> : <AlertCircle size={15} className="mt-0.5 flex-none text-red-600" />}
                    <div className="min-w-0"><p className="truncate text-xs font-bold">{result.fileName}</p><p className="text-[11px] text-muted-foreground">{result.reason ?? t("talentPool.accepted")}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-white">
          <div className="grid gap-3 border-b border-border p-4 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
            <label className="flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3"><Search size={14} className="text-muted-foreground" /><input value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder={t("talentPool.searchPlaceholder")} className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
            <label className="flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3"><Tag size={14} className="text-muted-foreground" /><input value={tagInput} onChange={event => setTagInput(event.target.value)} placeholder={t("talentPool.tagPlaceholder")} className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
            <select value={status} onChange={event => { setStatus(event.target.value as TalentPoolStatus | "ALL"); setPage(1); }} className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-semibold outline-none focus:border-primary">
              {STATUS_OPTIONS.map(option => <option key={option} value={option}>{statusLabel(option, language)}</option>)}
            </select>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-sm font-semibold text-muted-foreground">{t("common.loading")}</div>
          ) : loadError ? (
            <div className="py-16 text-center"><AlertCircle size={28} className="mx-auto mb-2 text-red-500" /><p className="text-sm font-semibold text-red-700">{loadError}</p><button onClick={() => void loadEntries()} className="mt-3 text-xs font-bold text-primary underline">{t("talentPool.retry")}</button></div>
          ) : data.items.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground"><UsersRound size={30} className="mx-auto mb-3 opacity-40" /><p className="text-sm font-semibold">{t("talentPool.empty")}</p></div>
          ) : (
            <div className="divide-y divide-border">
              {data.items.map(entry => {
                const email = stringField(entry.structuredData?.email) || entry.candidate.email || "—";
                const title = stringField(entry.structuredData?.title) || t("talentPool.noTitle");
                return (
                  <Link key={entry.id} to={`/admin/talent-pool/${entry.id}`} className="group flex items-center gap-4 p-4 transition-colors hover:bg-pink-50/50">
                    <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {initials(entry.candidate.fullName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-foreground transition-colors group-hover:text-primary">{entry.candidate.fullName}</p>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          {entry.promotedApplicationId ? t("talentPool.openApplication") : t("talentPool.keepGeneral")}
                        </span>
                        {entry.tags.slice(0, 2).map(item => (
                          <span key={item} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{item}</span>
                        ))}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {title} · {email}
                      </p>
                    </div>
                    <div className="hidden flex-shrink-0 items-center gap-3 sm:flex">
                      <StatusBadge status={entry.status} language={language} />
                      <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt, language)}</span>
                    </div>
                    <ChevronRight size={14} className="flex-shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                  </Link>
                );
              })}
            </div>
          )}
          <ListPagination currentPage={Math.min(page, totalPages)} pageSize={PAGE_SIZE} totalItems={data.total} onPageChange={setPage} />
      </section>
    </div>
  );
}

export default function TalentPool() {
  return (
    <AdminLayout>
      <TalentPoolContent />
    </AdminLayout>
  );
}

export function StatusBadge({ status, language }: { status: TalentPoolStatus; language: "vi" | "en" }) {
  const tone = status === "COMPLETED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status === "FAILED" ? "border-red-200 bg-red-50 text-red-700" : status === "EXTRACTING" || status === "ANALYZING" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-700";
  return <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${tone}`}>{statusLabel(status, language)}</span>;
}

function statusLabel(status: TalentPoolStatus | "ALL", language: "vi" | "en") {
  const labels = language === "vi"
    ? { ALL: "Tất cả", PENDING: "Đang chờ", EXTRACTING: "Đang trích xuất", EXTRACTED: "Đã trích xuất", ANALYZING: "Đang phân tích", COMPLETED: "Hoàn tất", FAILED: "Thất bại" }
    : { ALL: "All", PENDING: "Pending", EXTRACTING: "Extracting", EXTRACTED: "Extracted", ANALYZING: "Analyzing", COMPLETED: "Completed", FAILED: "Failed" };
  return labels[status];
}

function readMaxFileSizeMb() {
  const value = Number(import.meta.env.VITE_MAX_CV_FILE_SIZE_MB ?? 10);
  return Number.isFinite(value) && value > 0 ? value : 10;
}

function fileKey(file: File) { return `${file.name}:${file.size}:${file.lastModified}`; }
function formatFileSize(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
function formatDate(value: string, language: "vi" | "en") { return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-US", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value)); }
function stringField(value: unknown) { return typeof value === "string" ? value : ""; }
function initials(name: string) { return name.trim().split(/\s+/).slice(-2).map(part => part[0]).join("").toUpperCase(); }
