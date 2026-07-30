import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { AlertCircle, CheckCircle2, ChevronRight, FileText, Search, Trash2, Upload, Users, X } from "lucide-react";
import { useData, type CandidateStatus } from "@/app/data";
import { translateCandidateStatus, useLanguage } from "@/app/i18n";
import ListPagination from "@/app/components/ListPagination";
import AdminLayout from "@/app/layouts/AdminLayout";
import { notificationService } from "@/app/services/notification";
import {
  listTalentPool,
  type TalentPoolListItem,
  type TalentPoolUploadResult,
  uploadTalentPoolFiles,
} from "@/app/services/talent-pool-api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { CANDIDATE_STATUS_CONFIG, CANDIDATE_WORKFLOW_STATUSES } from "@/app/status-config";

const ITEMS_PER_PAGE = 10;
const TALENT_POOL_FETCH_SIZE = 100;

const TALENT_POOL_STATUS: CandidateStatus = "talent_pool";
const BULK_UPLOAD_MODE = "bulk";
const PER_FILE_UPLOAD_MODE = "per-file";

const STATUS_OPTS: (CandidateStatus | "all")[] = [
  "all",
  ...CANDIDATE_WORKFLOW_STATUSES,
  TALENT_POOL_STATUS,
];

type UploadMode = typeof BULK_UPLOAD_MODE | typeof PER_FILE_UPLOAD_MODE;

function readUrlStatus(
  searchParams: ReturnType<typeof useSearchParams>[0],
): CandidateStatus | "all" {
  const value = searchParams.get("status");
  if (value && (STATUS_OPTS as readonly string[]).includes(value)) {
    return value as CandidateStatus | "all";
  }
  return "all";
}

type UnifiedCandidateRow = {
  key: string;
  kind: "application" | "pool";
  name: string;
  email: string;
  title: string;
  date: string;
  status: CandidateStatus;
  applicationsCount: number;
  hasNew: boolean;
  href: string;
  candidate?: ReturnType<typeof useData>["candidateProfiles"][number];
  poolEntry?: TalentPoolListItem;
};

export default function CandidateInbox() {
  const { candidateProfiles, jobs, reloadAdminData, deleteCandidate } = useData();
  const { language, t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CandidateStatus | "all">(
    () => readUrlStatus(searchParams),
  );
  const [jobFilter, setJobFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [poolEntries, setPoolEntries] = useState<TalentPoolListItem[]>([]);
  const [talentPoolTotal, setTalentPoolTotal] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [targetJobId, setTargetJobId] = useState("");
  const [uploadMode, setUploadMode] = useState<UploadMode>(BULK_UPLOAD_MODE);
  const [fileTargetJobIds, setFileTargetJobIds] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<TalentPoolUploadResult[]>([]);
  const [candidateToDelete, setCandidateToDelete] = useState<(typeof candidateProfiles)[number] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadPoolEntries = useCallback(async () => {
    const response = await listTalentPool({ page: 1, pageSize: TALENT_POOL_FETCH_SIZE });
    setPoolEntries(response.items);
    setTalentPoolTotal(response.total);
  }, []);

  const rows: UnifiedCandidateRow[] = [];
  const applicationCandidateIds = new Set(candidateProfiles.map(candidate => candidate.id));

  for (const candidate of candidateProfiles) {
    const matchingApplications = candidate.applications.filter(application =>
      (jobFilter === "all" || application.jobId === jobFilter) &&
      (statusFilter === "all" || application.status === statusFilter),
    );
    const latestApplication = matchingApplications[0] ?? candidate.applications[0];
    if (!latestApplication || matchingApplications.length === 0) continue;

    rows.push({
      key: `application:${candidate.id}`,
      kind: "application",
      name: candidate.name,
      email: candidate.email,
      title: latestApplication.jobTitle,
      date: latestApplication.appliedAt,
      status: latestApplication.status,
      applicationsCount: candidate.applications.length,
      hasNew: candidate.applications.some(application => application.status === "new"),
      href: `/admin/candidates/${candidate.id}?application=${latestApplication.applicationId}`,
      candidate,
    });
  }

  for (const entry of poolEntries) {
    const title = stringField(entry.structuredData?.title) || t("talentPool.noTitle");
    const email = stringField(entry.structuredData?.email) || entry.candidate.email || "";
    const shouldShowPoolRow =
      (statusFilter === "all" || statusFilter === TALENT_POOL_STATUS) &&
      jobFilter === "all" &&
      !applicationCandidateIds.has(entry.candidate.id);

    if (!shouldShowPoolRow) continue;

    rows.push({
      key: `pool:${entry.id}`,
      kind: "pool",
      name: entry.candidate.fullName,
      email,
      title,
      date: formatDate(entry.createdAt, language),
      status: TALENT_POOL_STATUS,
      applicationsCount: 0,
      hasNew: false,
      href: `/admin/talent-pool/${entry.id}`,
      poolEntry: entry,
    });
  }

  const filtered = rows.filter(row => {
    const q = search.toLowerCase();
    return !q || [row.name, row.email, row.title, ...(row.poolEntry?.tags ?? [])].some(value => value.toLowerCase().includes(q));
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedRows = filtered.slice(
    (activePage - 1) * ITEMS_PER_PAGE,
    activePage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(page => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    const q = new URLSearchParams(searchParams);
    if (statusFilter === "all") {
      q.delete("status");
    } else {
      q.set("status", statusFilter);
    }
    setSearchParams(q, { replace: true });
  }, [statusFilter, setSearchParams, searchParams]);

  useEffect(() => {
    const fromUrl = readUrlStatus(searchParams);
    setStatusFilter(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    const status = readUrlStatus(searchParams);
    void reloadAdminData(status === "all" ? undefined : status);
  }, [searchParams, reloadAdminData]);

  useEffect(() => {
    void loadPoolEntries()
      .catch(() => setTalentPoolTotal(0));
  }, [loadPoolEntries]);

  useEffect(() => {
    if (!poolEntries.some(entry => entry.status === "PENDING" || entry.status === "EXTRACTING")) return;
    const timer = window.setInterval(() => void loadPoolEntries().catch(() => undefined), 5_000);
    return () => window.clearInterval(timer);
  }, [loadPoolEntries, poolEntries]);

  async function handleUpload() {
    if (!files.length || isUploading) return;
    setIsUploading(true);
    setUploadResults([]);
    const toastId = notificationService.loading(t("talentPool.uploading"));
    try {
      const responses = uploadMode === BULK_UPLOAD_MODE
        ? [await uploadTalentPoolFiles(files, targetJobId || undefined)]
        : await Promise.all(
          groupFilesByTargetJob(files, fileTargetJobIds).map(group =>
            uploadTalentPoolFiles(group.files, group.targetJobId || undefined),
          ),
        );
      const results = responses.flatMap(response => response.results);
      setUploadResults(results);
      const created = results.filter(result => result.status === "created").length;
      notificationService.success(`${created} ${t("talentPool.uploadedCount")}`, toastId);
      if (created > 0) {
        setFiles([]);
        setFileTargetJobIds({});
        if (fileInputRef.current) fileInputRef.current.value = "";
        await loadPoolEntries();
        await reloadAdminData(statusFilter === "all" ? undefined : statusFilter);
      }
    } catch (error) {
      notificationService.error(error, t("talentPool.uploadError"), toastId);
    } finally {
      setIsUploading(false);
    }
  }

  function addFiles(selectedFiles: File[]) {
    setFiles(current => {
      const known = new Set(current.map(fileKey));
      const next = [...current];
      for (const file of selectedFiles) {
        if (known.has(fileKey(file))) continue;
        known.add(fileKey(file));
        next.push(file);
      }
      return next;
    });
  }

  function removeFile(file: File) {
    const key = fileKey(file);
    setFiles(current => current.filter(item => fileKey(item) !== key));
    setFileTargetJobIds(current => {
      const rest = { ...current };
      delete rest[key];
      return rest;
    });
  }

  function updateFileTarget(file: File, jobId: string) {
    setFileTargetJobIds(current => ({ ...current, [fileKey(file)]: jobId }));
  }

  const activeJobs = jobs.filter(job => job.status !== "archived");

  async function handleDeleteCandidate() {
    if (!candidateToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteCandidate(candidateToDelete.id);
      setCandidateToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("admin.candidateInbox")}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {candidateProfiles.length + talentPoolTotal} {t("admin.totalCandidatesSummary")} ·{" "}
          {candidateProfiles.filter(c => c.applications.some(a => a.status === "new")).length}{" "}
          {t("admin.unreviewed")} · {talentPoolTotal} {t("talentPool.profileCount")}
        </p>
      </div>

      <div className="mb-5 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="grid items-stretch gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_312px]">
          <section className="flex min-w-0 flex-col gap-3">
            <div
              onDragEnter={event => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={event => event.preventDefault()}
              onDragLeave={event => {
                if (event.currentTarget === event.target) setIsDragging(false);
              }}
              onDrop={event => {
                event.preventDefault();
                setIsDragging(false);
                addFiles(Array.from(event.dataTransfer.files));
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex min-h-56 flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center transition-colors sm:px-5 ${isDragging ? "border-primary bg-pink-50" : "border-pink-100 bg-background/60 hover:border-primary/40 hover:bg-pink-50/40"}`}
            >
              <div className="flex size-14 items-center justify-center rounded-full border border-pink-100 bg-white text-primary shadow-sm">
                <Upload size={21} />
              </div>
              <div className="mt-4 min-w-0">
                <p className="text-lg font-black text-foreground">{t("talentPool.dropTitle")}</p>
                <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                  {files.length
                    ? `${files.length} ${t("talentPool.selectedFiles")} · ${uploadMode === BULK_UPLOAD_MODE ? t("talentPool.bulkAssign") : t("talentPool.perFileAssign")}`
                    : `${t("talentPool.keepGeneral")} · ${t("talentPool.targetJob")}`}
                </p>
              </div>
            </div>

            {(files.length > 0 || uploadResults.length > 0) && (
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {files.map(file => (
                  <div key={fileKey(file)} className="min-w-0 rounded-lg border border-border bg-white p-2.5 shadow-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText size={13} className="flex-none text-primary" />
                      <span className="min-w-0 flex-1 truncate text-xs font-bold text-foreground">{file.name}</span>
                      <button type="button" onClick={() => removeFile(file)} className="flex size-6 flex-none items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label={t("talentPool.removeFile")}>
                        <X size={13} />
                      </button>
                    </div>
                    {uploadMode === PER_FILE_UPLOAD_MODE && (
                      <select value={fileTargetJobIds[fileKey(file)] ?? ""} onChange={event => updateFileTarget(file, event.target.value)} className="mt-2 h-8 w-full rounded-md border border-border bg-input-background px-2 text-xs font-semibold text-muted-foreground outline-none focus:border-primary">
                        <option value="">{t("talentPool.keepGeneral")}</option>
                        {activeJobs.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}
                      </select>
                    )}
                  </div>
                ))}
                {uploadResults.map((result, index) => (
                  <span key={`${result.fileName}-${index}`} className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-bold text-muted-foreground shadow-sm">
                    {result.status === "created" ? <CheckCircle2 size={13} className="flex-none text-emerald-600" /> : <AlertCircle size={13} className="flex-none text-red-600" />}
                    <span className="truncate">{result.fileName}</span>
                  </span>
                ))}
              </div>
            )}
          </section>

          <aside className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-pink-100 bg-pink-50/30 p-3">
            <div className="grid grid-cols-2 gap-1 rounded-full border border-border bg-white p-1">
              <button type="button" onClick={() => setUploadMode(BULK_UPLOAD_MODE)} className={`min-h-9 rounded-full px-1.5 text-[11px] font-bold leading-tight transition-colors ${uploadMode === BULK_UPLOAD_MODE ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-pink-50 hover:text-primary"}`}>
                {t("talentPool.bulkAssign")}
              </button>
              <button type="button" onClick={() => setUploadMode(PER_FILE_UPLOAD_MODE)} className={`min-h-9 rounded-full px-1.5 text-[11px] font-bold leading-tight transition-colors ${uploadMode === PER_FILE_UPLOAD_MODE ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-pink-50 hover:text-primary"}`}>
                {t("talentPool.perFileAssign")}
              </button>
            </div>

            {uploadMode === BULK_UPLOAD_MODE ? (
              <select value={targetJobId} onChange={event => setTargetJobId(event.target.value)} className="h-10 min-w-0 rounded-xl border border-border bg-input-background px-3 text-xs font-semibold text-muted-foreground outline-none focus:border-primary">
                <option value="">{t("talentPool.keepGeneral")}</option>
                {activeJobs.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}
              </select>
            ) : (
              <div className="flex min-h-10 items-center rounded-xl border border-border bg-white px-3 text-xs font-semibold text-muted-foreground">
                {files.length ? `${files.length} ${t("talentPool.selectedFiles")}` : t("talentPool.perFileAssign")}
              </div>
            )}

            <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="sr-only" onClick={event => { event.currentTarget.value = ""; }} onChange={event => addFiles(Array.from(event.target.files ?? []))} />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-white px-3 text-xs font-bold text-primary hover:bg-pink-50">
                <FileText size={15} /> {t("talentPool.chooseFiles")}
              </button>
              <button type="button" disabled={!files.length || isUploading} onClick={() => void handleUpload()} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
                <Upload size={15} /> {isUploading ? t("talentPool.uploading") : `${t("talentPool.uploadButton")} (${files.length})`}
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-border p-4 mb-4 space-y-3">
        <div className="flex items-center gap-2 bg-background rounded-xl px-3 py-2 border border-border">
          <Search size={14} className="text-muted-foreground" />
          <input
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={t("admin.searchCandidates")}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTS.map(status => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                statusFilter === status
                  ? "bg-primary text-white border-primary"
                  : "bg-white border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {translateCandidateStatus(status, language)}
            </button>
          ))}
          <div className="w-px h-4 bg-border self-center" />
          <select
            value={jobFilter}
            onChange={e => {
              setJobFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1 rounded-full text-xs font-bold border border-border bg-white text-muted-foreground outline-none focus:border-primary transition-colors"
          >
            <option value="all">{t("admin.allPositions")}</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
          <span className="w-full text-xs text-muted-foreground sm:ml-auto sm:w-auto self-center">
            {filtered.length} {t("jobs.resultCount")}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users size={32} className="mx-auto mb-3 opacity-40" />
            <p className="font-semibold">{t("admin.noCandidates")}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {paginatedRows.map(row => (
                <div
                  key={row.key}
                  className="group flex items-center gap-2 p-3 transition-colors hover:bg-pink-50/50 sm:gap-4 sm:p-4"
                >
                  <Link to={row.href} className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      {row.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">{row.name}</p>
                        {row.hasNew && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          {row.kind === "pool" ? t("talentPool.keepGeneral") : `${row.applicationsCount} ${t("admin.applications")}`}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {row.title} · {row.email || "—"}
                      </p>
                    </div>
                  </Link>
                  <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${CANDIDATE_STATUS_CONFIG[row.status].badgeClass}`}>
                      {translateCandidateStatus(row.status, language)}
                    </span>
                    <span className="text-xs text-muted-foreground">{row.date}</span>
                  </div>
                  {row.candidate && (
                    <button
                      type="button"
                      onClick={() => setCandidateToDelete(row.candidate ?? null)}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                      title={t("admin.deleteCandidate")}
                      aria-label={`${t("admin.deleteCandidate")}: ${row.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
            ))}
          </div>
        )}
      </div>

      <ListPagination
        currentPage={activePage}
        pageSize={ITEMS_PER_PAGE}
        totalItems={filtered.length}
        onPageChange={setCurrentPage}
      />
      <AlertDialog open={Boolean(candidateToDelete)} onOpenChange={open => { if (!open && !isDeleting) setCandidateToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.deleteCandidateTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.deleteCandidateDescription")} <strong>{candidateToDelete?.name}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("admin.cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={() => void handleDeleteCandidate()} className="bg-red-600 text-white hover:bg-red-700">
              {isDeleting ? t("admin.deletingCandidate") : t("admin.deleteCandidate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

function stringField(value: unknown) {
  return typeof value === "string" ? value : "";
}

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function groupFilesByTargetJob(files: File[], fileTargetJobIds: Record<string, string>) {
  const groups = new Map<string, File[]>();

  for (const file of files) {
    const targetJobId = fileTargetJobIds[fileKey(file)] ?? "";
    groups.set(targetJobId, [...(groups.get(targetJobId) ?? []), file]);
  }

  return Array.from(groups, ([targetJobId, groupedFiles]) => ({
    targetJobId,
    files: groupedFiles,
  }));
}

function formatDate(value: string, language: "vi" | "en") {
  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
