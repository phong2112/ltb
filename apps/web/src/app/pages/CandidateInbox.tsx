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
const TALENT_POOL_FETCH_SIZE = 1000;

const TALENT_POOL_STATUS: CandidateStatus = "talent_pool";

const STATUS_OPTS: (CandidateStatus | "all")[] = [
  "all",
  ...CANDIDATE_WORKFLOW_STATUSES,
  TALENT_POOL_STATUS,
];

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
      const response = await uploadTalentPoolFiles(files, targetJobId || undefined);
      setUploadResults(response.results);
      const created = response.results.filter(result => result.status === "created").length;
      notificationService.success(`${created} ${t("talentPool.uploadedCount")}`, toastId);
      if (created > 0) {
        setFiles([]);
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

      <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-white">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-black text-foreground">{t("talentPool.dropTitle")}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {files.length ? files.map(file => file.name).join(", ") : `${t("talentPool.keepGeneral")} · ${t("talentPool.targetJob")}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={targetJobId} onChange={event => setTargetJobId(event.target.value)} className="h-9 w-full min-w-0 rounded-lg border border-border bg-input-background px-3 text-xs font-semibold text-muted-foreground outline-none focus:border-primary sm:w-auto sm:min-w-52">
              <option value="">{t("talentPool.keepGeneral")}</option>
              {jobs.filter(job => job.status !== "archived").map(job => <option key={job.id} value={job.id}>{job.title}</option>)}
            </select>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary/30 bg-white px-3 text-xs font-bold text-primary hover:bg-pink-50">
              <FileText size={14} /> {t("talentPool.chooseFiles")}
            </button>
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="sr-only" onClick={event => { event.currentTarget.value = ""; }} onChange={event => setFiles(Array.from(event.target.files ?? []))} />
            <button type="button" disabled={!files.length || isUploading} onClick={() => void handleUpload()} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
              <Upload size={14} /> {isUploading ? t("talentPool.uploading") : `${t("talentPool.uploadButton")} (${files.length})`}
            </button>
          </div>
        </div>
        {(files.length > 0 || uploadResults.length > 0) && (
          <div className="flex flex-wrap gap-2 border-t border-border bg-background/40 px-4 py-3">
            {files.map(file => (
              <span key={`${file.name}:${file.size}:${file.lastModified}`} className="inline-flex max-w-72 items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-bold text-foreground">
                <FileText size={13} className="flex-none text-primary" />
                <span className="truncate">{file.name}</span>
                <button type="button" onClick={() => setFiles(current => current.filter(item => item !== file))} className="text-muted-foreground hover:text-red-600" aria-label={t("talentPool.removeFile")}>
                  <X size={13} />
                </button>
              </span>
            ))}
            {uploadResults.map((result, index) => (
              <span key={`${result.fileName}-${index}`} className="inline-flex max-w-72 items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-bold text-muted-foreground">
                {result.status === "created" ? <CheckCircle2 size={13} className="flex-none text-emerald-600" /> : <AlertCircle size={13} className="flex-none text-red-600" />}
                <span className="truncate">{result.fileName}</span>
              </span>
            ))}
          </div>
        )}
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

function formatDate(value: string, language: "vi" | "en") {
  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
