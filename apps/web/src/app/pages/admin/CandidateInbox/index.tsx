import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { AlertCircle, CheckCircle2, FileText, Upload, X } from "lucide-react";
import { cvAcceptAttribute } from "@hr-copilot/shared";
import { useData, type CandidateStatus } from "@/app/data";
import { useLanguage } from "@/app/services/i18n-service";
import ListPagination from "@/app/components/ListPagination";
import AdminLayout from "@/app/layouts/AdminLayout";
import { notificationService } from "@/app/services/notification.service";
import {
  deleteTalentPoolEntry,
  listTalentPool,
  uploadTalentPoolFiles,
} from "@/app/apis/requests";
import type { TalentPoolListItem, TalentPoolUploadResult } from "@/app/apis/models";
import { appendReturnTo } from "@/app/utils/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/Common/alert-dialog";
import { CandidateFilters, CandidateList } from "./components";
import {
  BULK_UPLOAD_MODE,
  ITEMS_PER_PAGE,
  PER_FILE_UPLOAD_MODE,
  SORT_NEWEST,
  TALENT_POOL_FETCH_SIZE,
  TALENT_POOL_STATUS,
} from "./constants";
import type { SortOrder, UnifiedCandidateRow, UploadMode } from "./types";
import {
  compareRows,
  fileKey,
  formatDate,
  groupFilesByTargetJob,
  readUrlPage,
  readUrlSort,
  readUrlStatus,
  stringField,
  stringList,
  timestamp,
} from "./utils";

export default function CandidateInbox() {
  const { candidateProfiles, jobs, reloadAdminData, deleteCandidate } = useData();
  const { language, t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<CandidateStatus | "all">(
    () => readUrlStatus(searchParams),
  );
  const [jobFilter, setJobFilter] = useState(() => searchParams.get("job") || "all");
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => readUrlSort(searchParams));
  const [currentPage, setCurrentPage] = useState(() => readUrlPage(searchParams));
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
  const [poolEntryToDelete, setPoolEntryToDelete] = useState<TalentPoolListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadPoolEntries = useCallback(async () => {
    const response = await listTalentPool({ page: 1, pageSize: TALENT_POOL_FETCH_SIZE });
    setPoolEntries(response.items);
    setTalentPoolTotal(response.total);
  }, []);

  const rows: UnifiedCandidateRow[] = [];
  const applicationCandidateIds = new Set(candidateProfiles.map(candidate => candidate.id));
  const returnTo = buildCandidatesReturnTo(search, statusFilter, jobFilter, sortOrder, currentPage);

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
      sortTimestamp: timestamp(latestApplication.appliedAtIso),
      status: latestApplication.status,
      applicationsCount: candidate.applications.length,
      hasNew: candidate.applications.some(application => application.status === "new"),
      href: appendReturnTo(`/admin/candidates/${candidate.id}?application=${latestApplication.applicationId}`, returnTo),
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
      sortTimestamp: timestamp(entry.createdAt),
      status: TALENT_POOL_STATUS,
      applicationsCount: 0,
      hasNew: false,
      href: appendReturnTo(`/admin/talent-pool/${entry.id}`, returnTo),
      poolEntry: entry,
    });
  }

  const filtered = rows.filter(row => {
    const q = search.toLowerCase();
    return !q || [row.name, row.email, row.title, ...stringList(row.poolEntry?.structuredData?.skills)].some(value => value.toLowerCase().includes(q));
  }).sort((left, right) => compareRows(left, right, sortOrder, language));

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
    setSearch(searchParams.get("q") ?? "");
    setStatusFilter(readUrlStatus(searchParams));
    setJobFilter(searchParams.get("job") || "all");
    setSortOrder(readUrlSort(searchParams));
    setCurrentPage(readUrlPage(searchParams));
  }, [searchParams]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    setOptionalParam(next, "q", search.trim());
    setOptionalParam(next, "status", statusFilter === "all" ? "" : statusFilter);
    setOptionalParam(next, "job", jobFilter === "all" ? "" : jobFilter);
    setOptionalParam(next, "sort", sortOrder === SORT_NEWEST ? "" : sortOrder);
    setOptionalParam(next, "page", currentPage > 1 ? String(currentPage) : "");
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
  }, [currentPage, jobFilter, search, searchParams, setSearchParams, sortOrder, statusFilter]);

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

  async function handleDeletePoolEntry() {
    if (!poolEntryToDelete || isDeleting) return;
    setIsDeleting(true);
    const toastId = notificationService.loading(t("talentPool.deleting"));
    try {
      await deleteTalentPoolEntry(poolEntryToDelete.id);
      notificationService.success(t("talentPool.deleted"), toastId);
      setPoolEntryToDelete(null);
      await loadPoolEntries();
    } catch (error) {
      notificationService.error(error, t("talentPool.deleteError"), toastId);
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

            <input ref={fileInputRef} type="file" multiple accept={cvAcceptAttribute} className="sr-only" onClick={event => { event.currentTarget.value = ""; }} onChange={event => addFiles(Array.from(event.target.files ?? []))} />
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

      <CandidateFilters
        filteredCount={filtered.length}
        jobs={jobs}
        jobFilter={jobFilter}
        language={language}
        search={search}
        sortOrder={sortOrder}
        statusFilter={statusFilter}
        t={t}
        onJobFilterChange={value => {
          setJobFilter(value);
          setCurrentPage(1);
        }}
        onSearchChange={value => {
          setSearch(value);
          setCurrentPage(1);
        }}
        onSortOrderChange={value => {
          setSortOrder(value);
          setCurrentPage(1);
        }}
        onStatusFilterChange={value => {
          setStatusFilter(value);
          setCurrentPage(1);
        }}
      />

      <CandidateList
        language={language}
        rows={paginatedRows}
        t={t}
        onDeleteApplicationCandidate={row => setCandidateToDelete(row.candidate ?? null)}
        onDeletePoolEntry={row => setPoolEntryToDelete(row.poolEntry ?? null)}
      />

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
      <AlertDialog open={Boolean(poolEntryToDelete)} onOpenChange={open => { if (!open && !isDeleting) setPoolEntryToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("talentPool.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("talentPool.deleteDescription")} <strong>{poolEntryToDelete?.candidate.fullName}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("admin.cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={() => void handleDeletePoolEntry()} className="bg-red-600 text-white hover:bg-red-700">
              {isDeleting ? t("talentPool.deleting") : t("talentPool.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

function setOptionalParam(params: URLSearchParams, key: string, value: string) {
  if (value) {
    params.set(key, value);
  } else {
    params.delete(key);
  }
}

function buildCandidatesReturnTo(
  search: string,
  statusFilter: CandidateStatus | "all",
  jobFilter: string,
  sortOrder: SortOrder,
  page: number,
) {
  const params = new URLSearchParams();
  setOptionalParam(params, "q", search.trim());
  setOptionalParam(params, "status", statusFilter === "all" ? "" : statusFilter);
  setOptionalParam(params, "job", jobFilter === "all" ? "" : jobFilter);
  setOptionalParam(params, "sort", sortOrder === SORT_NEWEST ? "" : sortOrder);
  setOptionalParam(params, "page", page > 1 ? String(page) : "");
  const query = params.toString();
  return query ? `/admin/candidates?${query}` : "/admin/candidates";
}
