import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { notificationService, type ActionNotification } from "@/app/services/notification";
import type { CandidateStatus, JobStatus } from "@/app/status-config";

export type { CandidateStatus, JobStatus } from "@/app/status-config";
export type CandidateMessageChannel = "system" | "messenger" | "zalo" | "email" | "linkedin";
export type CandidateMessageDirection = "inbound" | "outbound";

export type CandidateMessage = {
  id: string;
  applicationId: string;
  channel: CandidateMessageChannel;
  direction: CandidateMessageDirection;
  content: string;
  createdAt: string;
};

export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  level: string;
  salary: string;
  tags: string[];
  description: string;
  requirements: string;
  benefits: string;
  status: JobStatus;
  posted: string;
  applicants: number;
  urgent: boolean;
  logo: string;
};

export type Candidate = {
  id: string;
  applicationId: string;
  candidateId: string;
  name: string;
  email: string;
  phone: string;
  applicationArea: string;
  cvUrl: string;
  cvFile?: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  };
  coverNote: string;
  hrNote: string;
  jobId: string;
  jobTitle: string;
  status: CandidateStatus;
  appliedAt: string;
  followUpDate: string;
  aiScore: number;
  aiSummary: string;
  strengths: string[];
  risks: string[];
  missingReqs: string[];
  screeningAnswers: { q: string; a: string }[];
  messages: CandidateMessage[];
};

export type CandidateProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  applications: Candidate[];
};

type NewCandidate = {
  name: string;
  email: string;
  phone: string;
  applicationArea: string;
  cvUrl: string;
  note: string;
  jobId: string;
  jobTitle: string;
  status: CandidateStatus;
  cvFile?: File | null;
};

type ApiJob = {
  id: string;
  title: string;
  company?: string | null;
  department?: string | null;
  location?: string | null;
  employment?: string | null;
  level?: string | null;
  salaryRange?: string | null;
  tags?: string[] | null;
  description: string;
  requirements: string;
  benefits?: string | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
  urgent?: boolean | null;
  logo?: string | null;
  createdAt?: string;
  _count?: {
    applications?: number;
  };
};

type ApiApplication = {
  id: string;
  candidateId: string;
  jobId: string;
  submittedFullName: string;
  submittedEmail?: string | null;
  submittedPhone?: string | null;
  submittedPortfolioUrl?: string | null;
  coverNote?: string | null;
  hrNotes?: string | null;
  status: string;
  answers?: unknown;
  followUpTask?: {
    dueAt?: string | null;
  } | null;
  createdAt?: string;
  job?: ApiJob;
  matchResult?: {
    score?: number;
    strengths?: unknown;
    risks?: unknown;
    missingRequirements?: unknown;
    screeningQuestions?: unknown;
  } | null;
  cvParseResult?: {
    summary?: string | null;
  } | null;
  files?: {
    id: string;
    originalName?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
    path: string;
  }[];
  messages?: ApiCandidateMessage[];
  candidate?: {
    id: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    portfolioUrl?: string | null;
  };
};

type ApiCandidateProfile = {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  applications?: ApiApplication[];
};

type ApiCandidateMessage = {
  id: string;
  applicationId: string;
  channel: string;
  direction: string;
  content: string;
  createdAt: string;
};

type ApiAuthSession = {
  user?: {
    email: string;
    name: string;
  };
};

type LoginResult =
  | { ok: true }
  | { ok: false; reason: "invalidCredentials" | "apiUnavailable" };

type ApiRequestInit = RequestInit & {
  skipAuthRefresh?: boolean;
  notification?: ActionNotification;
};

type DataCtx = {
  jobs: Job[];
  candidateProfiles: CandidateProfile[];
  /** Application-level records used by pipeline, follow-up, and chat views. */
  candidates: Candidate[];
  isAdminLoggedIn: boolean;
  isAuthReady: boolean;
  isLoading: boolean;
  error: string;
  savedJobIds: string[];
  reloadPublicJobs: () => Promise<void>;
  reloadAdminData: () => Promise<void>;
  addJob: (j: Omit<Job, "id" | "posted" | "applicants">) => Promise<void>;
  updateJob: (id: string, patch: Partial<Job>) => Promise<void>;
  addCandidate: (c: NewCandidate) => Promise<void>;
  updateCandidate: (id: string, patch: Partial<Candidate>) => Promise<void>;
  sendCandidateMessage: (applicationId: string, channel: CandidateMessageChannel, content: string) => Promise<void>;
  isJobSaved: (id: string) => boolean;
  toggleSavedJob: (id: string) => boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
};

const DataContext = createContext<DataCtx>(null!);
const API_BASE = ((import.meta.env.VITE_API_BASE_PATH as string | undefined) ?? "/api").replace(/\/$/, "");
const SAVED_JOBS_STORAGE_KEY = "hr_copilot_saved_job_ids";

class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function readSavedJobIds() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(SAVED_JOBS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

async function apiRequest<T>(path: string, init: ApiRequestInit = {}) {
  const { skipAuthRefresh, notification, ...requestInit } = init;
  const bodyIsFormData = init.body instanceof FormData;
  const notificationId = notification ? notificationService.loading(notification.loading) : undefined;

  try {
    let response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      ...requestInit,
      headers: {
        ...(bodyIsFormData ? {} : { "Content-Type": "application/json" }),
        ...(init.headers ?? {}),
      },
    });

    if (response.status === 401 && !skipAuthRefresh && shouldAttemptAuthRefresh(path)) {
      const refreshed = await refreshAccessToken();

      if (refreshed) {
        response = await fetch(`${API_BASE}${path}`, {
          credentials: "include",
          ...requestInit,
          headers: {
            ...(bodyIsFormData ? {} : { "Content-Type": "application/json" }),
            ...(init.headers ?? {}),
          },
        });
      }
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const message = parseApiErrorMessage(body);
      throw new ApiRequestError(message || `Request failed with status ${response.status}`, response.status);
    }

    const result = response.status === 204 ? undefined as T : await response.json() as T;
    if (notification) notificationService.success(notification.success, notificationId);
    return result;
  } catch (error) {
    if (notification) notificationService.error(error, notification.error, notificationId);
    throw error;
  }
}

function parseApiErrorMessage(body: string) {
  if (!body.trim()) return "";

  try {
    const parsed = JSON.parse(body) as unknown;
    const record = asRecord(parsed);
    const message = record?.message;

    if (Array.isArray(message)) return message.filter((item): item is string => typeof item === "string").join("\n");
    if (typeof message === "string") return message;
  } catch {
    return body;
  }

  return body;
}

async function refreshAccessToken() {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    return response.ok;
  } catch {
    return false;
  }
}

function shouldAttemptAuthRefresh(path: string) {
  return path !== "/auth/login" && path !== "/auth/refresh" && path !== "/auth/logout";
}

function mapJobStatus(status: ApiJob["status"]): JobStatus {
  if (status === "PUBLISHED") return "published";
  if (status === "CLOSED") return "closed";
  if (status === "ARCHIVED") return "archived";
  return "draft";
}

function toApiJobStatus(status?: JobStatus) {
  if (!status) return undefined;
  const statusMap: Record<JobStatus, ApiJob["status"]> = {
    published: "PUBLISHED",
    draft: "DRAFT",
    closed: "CLOSED",
    archived: "ARCHIVED",
  };
  return statusMap[status];
}

function mapApplicationStatus(status?: string): CandidateStatus {
  if (status === "NEW") return "new";
  if (status === "INTERVIEW") return "interview";
  if (status === "OFFER") return "offered";
  if (status === "REJECTED") return "rejected";
  return "reviewing";
}

function toApiApplicationStatus(status?: CandidateStatus) {
  if (!status) return undefined;
  const statusMap: Record<CandidateStatus, string> = {
    new: "NEW",
    reviewing: "REVIEWING",
    interview: "INTERVIEW",
    offered: "OFFER",
    rejected: "REJECTED",
  };
  return statusMap[status];
}

function mapJob(job: ApiJob): Job {
  return {
    id: job.id,
    title: job.title,
    company: job.company ?? job.department ?? "Lường Thị Bích HR",
    location: job.location === "TP. Hồ Chí Minh" ? "TP Hồ Chí Minh" : job.location ?? "",
    type: job.employment ?? "Full-time",
    level: job.level ?? "Mid-level",
    salary: job.salaryRange ?? "",
    tags: Array.isArray(job.tags) ? job.tags : [],
    description: job.description,
    requirements: job.requirements,
    benefits: job.benefits ?? "",
    status: mapJobStatus(job.status),
    posted: formatPostedDate(job.createdAt),
    applicants: job._count?.applications ?? 0,
    urgent: Boolean(job.urgent),
    logo: job.logo ?? "🌷",
  };
}

function mapCandidate(application: ApiApplication): Candidate | null {
  const job = application.job;

  if (!job) return null;

  const answers = asRecord(application.answers);
  const screeningAnswers = parseScreeningAnswers(answers?.screeningAnswers);
  const legacyCoverNote = typeof answers?.coverNote === "string" ? answers.coverNote : typeof answers?.text === "string" ? answers.text : "";
  const cvFile = application.files?.[0];
  const cvPath = cvFile?.path;
  const uploadedCvUrl = cvFile?.id && cvFile.mimeType !== "text/uri-list" ? `${API_BASE}/admin/candidates/files/${cvFile.id}` : undefined;

  return {
    id: application.id,
    applicationId: application.id,
    candidateId: application.candidateId,
    name: application.submittedFullName,
    email: application.submittedEmail ?? "",
    phone: application.submittedPhone ?? "",
    applicationArea: typeof answers?.applicationArea === "string" ? answers.applicationArea : "",
    cvUrl: uploadedCvUrl ?? (cvPath && /^https?:\/\//.test(cvPath) ? cvPath : application.submittedPortfolioUrl ?? "#"),
    cvFile: cvFile ? {
      id: cvFile.id,
      originalName: cvFile.originalName ?? "CV ứng viên",
      mimeType: cvFile.mimeType ?? "",
      sizeBytes: cvFile.sizeBytes ?? 0,
    } : undefined,
    coverNote: application.coverNote ?? legacyCoverNote,
    hrNote: application.hrNotes ?? "",
    jobId: job.id,
    jobTitle: job.title,
    status: mapApplicationStatus(application.status),
    appliedAt: formatDate(application.createdAt),
    followUpDate: formatDate(application.followUpTask?.dueAt),
    aiScore: application.matchResult?.score ?? 0,
    aiSummary: application.cvParseResult?.summary ?? "Hồ sơ đang được AI phân tích...",
    strengths: toStringArray(application.matchResult?.strengths),
    risks: toStringArray(application.matchResult?.risks),
    missingReqs: toStringArray(application.matchResult?.missingRequirements),
    screeningAnswers,
    messages: (application.messages ?? []).map(mapCandidateMessage),
  };
}

function mapCandidateProfile(candidate: ApiCandidateProfile): CandidateProfile {
  const applications = (candidate.applications ?? [])
    .map(mapCandidate)
    .filter((application): application is Candidate => Boolean(application));

  return {
    id: candidate.id,
    name: candidate.fullName,
    email: candidate.email ?? applications[0]?.email ?? "",
    phone: candidate.phone ?? applications[0]?.phone ?? "",
    applications,
  };
}

function mapCandidateMessage(message: ApiCandidateMessage): CandidateMessage {
  return {
    id: message.id,
    applicationId: message.applicationId,
    channel: mapMessageChannel(message.channel),
    direction: message.direction === "inbound" ? "inbound" : "outbound",
    content: message.content,
    createdAt: message.createdAt,
  };
}

function mapMessageChannel(channel: string): CandidateMessageChannel {
  if (channel === "messenger" || channel === "zalo" || channel === "email" || channel === "linkedin") return channel;
  return "system";
}

function toJobPayload(job: Partial<Job>) {
  return {
    title: job.title,
    company: job.company,
    location: job.location,
    employment: job.type,
    level: job.level,
    salaryRange: job.salary === undefined ? undefined : job.salary.trim() || null,
    tags: job.tags,
    description: job.description,
    requirements: job.requirements,
    benefits: job.benefits,
    status: toApiJobStatus(job.status),
    urgent: job.urgent,
    logo: job.logo,
  };
}

function formatDate(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function formatPostedDate(value?: string) {
  if (!value) return "";

  const created = new Date(value).getTime();
  const days = Math.max(0, Math.floor((Date.now() - created) / 86_400_000));

  if (days === 0) return "Hôm nay";
  if (days === 1) return "1 ngày trước";
  if (days < 7) return `${days} ngày trước`;
  return `${Math.floor(days / 7)} tuần trước`;
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function parseScreeningAnswers(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const record = asRecord(item);
    const q = record?.q;
    const a = record?.a;
    return typeof q === "string" && typeof a === "string" ? [{ q, a }] : [];
  });
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidateProfiles, setCandidateProfiles] = useState<CandidateProfile[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedJobIds, setSavedJobIds] = useState<string[]>(readSavedJobIds);

  const reloadPublicJobs = useCallback(async () => {
    setError("");
    setIsLoading(true);

    try {
      const data = await apiRequest<ApiJob[]>("/jobs/public");
      setJobs(data.map(mapJob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu việc làm");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reloadAdminData = useCallback(async () => {
    setError("");
    setIsLoading(true);

    try {
      const [adminJobs, adminCandidates] = await Promise.all([
        apiRequest<ApiJob[]>("/admin/jobs"),
        apiRequest<ApiCandidateProfile[]>("/admin/candidates"),
      ]);
      const profiles = adminCandidates.map(mapCandidateProfile);
      setJobs(adminJobs.map(mapJob));
      setCandidateProfiles(profiles);
      setCandidates(profiles.flatMap(candidate => candidate.applications));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu quản trị");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadPublicJobs();
  }, [reloadPublicJobs]);

  useEffect(() => {
    async function loadAuthSession() {
      try {
        await apiRequest<ApiAuthSession>("/auth/me");
        setIsAdminLoggedIn(true);
      } catch {
        setIsAdminLoggedIn(false);
        setCandidateProfiles([]);
        setCandidates([]);
      } finally {
        setIsAuthReady(true);
      }
    }

    void loadAuthSession();
  }, []);

  useEffect(() => {
    if (isAdminLoggedIn) {
      void reloadAdminData();
    }
  }, [isAdminLoggedIn, reloadAdminData]);

  useEffect(() => {
    window.localStorage.setItem(SAVED_JOBS_STORAGE_KEY, JSON.stringify(savedJobIds));
  }, [savedJobIds]);

  const addJob = async (job: Omit<Job, "id" | "posted" | "applicants">) => {
    await apiRequest<ApiJob>("/admin/jobs", {
      method: "POST",
      body: JSON.stringify(toJobPayload(job)),
      notification: {
        loading: "Đang tạo vị trí tuyển dụng...",
        success: "Đã tạo vị trí tuyển dụng",
        error: "Không thể tạo vị trí tuyển dụng",
      },
    });
    await reloadAdminData();
  };

  const updateJob = async (id: string, patch: Partial<Job>) => {
    await apiRequest<ApiJob>(`/admin/jobs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(toJobPayload(patch)),
      notification: {
        loading: "Đang cập nhật vị trí...",
        success: "Đã cập nhật vị trí tuyển dụng",
        error: "Không thể cập nhật vị trí tuyển dụng",
      },
    });
    await reloadAdminData();
  };

  const addCandidate = async (candidate: NewCandidate) => {
    const form = new FormData();
    form.set("jobId", candidate.jobId);
    form.set("fullName", candidate.name);
    form.set("email", candidate.email);
    form.set("phone", candidate.phone);
    form.set("applicationArea", candidate.applicationArea);
    form.set("consentAccepted", "true");

    if (candidate.cvUrl.trim()) {
      form.set("portfolioUrl", candidate.cvUrl.trim());
    }

    if (candidate.note.trim()) {
      form.set("screeningAnswers", candidate.note.trim());
    }

    if (candidate.cvFile) {
      form.set("cv", candidate.cvFile);
    }

    await apiRequest("/applications", {
      method: "POST",
      body: form,
      notification: {
        loading: "Đang gửi hồ sơ ứng tuyển...",
        success: "Hồ sơ đã được gửi thành công",
        error: "Không thể gửi hồ sơ ứng tuyển",
      },
    });
    await reloadPublicJobs();
  };

  const updateCandidate = async (id: string, patch: Partial<Candidate>) => {
    const current = candidates.find((candidate) => candidate.id === id);
    if (!current) return;

    const body: { status?: string; followUpAt?: string | null; note?: string } = {
      status: toApiApplicationStatus(patch.status ?? current.status),
      note: patch.hrNote,
    };

    if (patch.followUpDate !== undefined) {
      body.followUpAt = patch.followUpDate || null;
    }

    await apiRequest(`/admin/candidates/applications/${current.applicationId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
      notification: {
        loading: "Đang cập nhật ứng viên...",
        success: "Đã cập nhật thông tin ứng viên",
        error: "Không thể cập nhật ứng viên",
      },
    });
    await reloadAdminData();
  };

  const sendCandidateMessage = async (applicationId: string, channel: CandidateMessageChannel, content: string) => {
    const message = await apiRequest<ApiCandidateMessage>(`/admin/candidates/applications/${applicationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ channel, content }),
      notification: {
        loading: "Đang gửi tin nhắn...",
        success: "Tin nhắn đã được gửi",
        error: "Không thể gửi tin nhắn",
      },
    });

    setCandidates((current) => current.map((candidate) => candidate.applicationId === applicationId ? {
      ...candidate,
      messages: [...candidate.messages, mapCandidateMessage(message)],
    } : candidate));
    setCandidateProfiles((current) => current.map(profile => ({
      ...profile,
      applications: profile.applications.map(application => application.applicationId === applicationId ? {
        ...application,
        messages: [...application.messages, mapCandidateMessage(message)],
      } : application),
    })));
  };

  const isJobSaved = (id: string) => savedJobIds.includes(id);

  const toggleSavedJob = (id: string) => {
    const willBeSaved = !savedJobIds.includes(id);
    setSavedJobIds((prev) => prev.includes(id) ? prev.filter((savedId) => savedId !== id) : [...prev, id]);
    return willBeSaved;
  };

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      await apiRequest<ApiAuthSession>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        notification: {
          loading: "Đang đăng nhập...",
          success: "Đăng nhập thành công",
          error: "Không thể đăng nhập",
        },
      });
      setIsAdminLoggedIn(true);
      await reloadAdminData();
      return { ok: true };
    } catch (error) {
      setIsAdminLoggedIn(false);
      setCandidateProfiles([]);
      setCandidates([]);
      return {
        ok: false,
        reason: error instanceof ApiRequestError && error.status === 401 ? "invalidCredentials" : "apiUnavailable",
      };
    }
  };

  const logout = async () => {
    await apiRequest("/auth/logout", {
      method: "POST",
      notification: {
        loading: "Đang đăng xuất...",
        success: "Đã đăng xuất",
        error: "Không thể kết nối máy chủ khi đăng xuất",
      },
    }).catch(() => undefined);
    setIsAdminLoggedIn(false);
    setCandidateProfiles([]);
    setCandidates([]);
    void reloadPublicJobs();
  };

  return (
    <DataContext.Provider value={{ jobs, candidateProfiles, candidates, isAdminLoggedIn, isAuthReady, isLoading, error, savedJobIds, reloadPublicJobs, reloadAdminData, addJob, updateJob, addCandidate, updateCandidate, sendCandidateMessage, isJobSaved, toggleSavedJob, login, logout }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
