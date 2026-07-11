import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

export type JobStatus = "published" | "draft";
export type CandidateStatus = "new" | "reviewing" | "interview" | "offered" | "rejected";
export type CandidateMessageChannel = "system" | "messenger" | "zalo" | "email" | "linkedin";
export type CandidateMessageDirection = "inbound" | "outbound";

export type CandidateMessage = {
  id: string;
  candidateId: string;
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
  name: string;
  email: string;
  phone: string;
  cvUrl: string;
  cvFile?: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  };
  note: string;
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

type NewCandidate = Omit<
  Candidate,
  "id" | "applicationId" | "appliedAt" | "followUpDate" | "aiScore" | "aiSummary" | "strengths" | "risks" | "missingReqs" | "screeningAnswers" | "messages" | "cvFile"
> & {
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
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  urgent?: boolean | null;
  logo?: string | null;
  createdAt?: string;
  _count?: {
    applications?: number;
  };
};

type ApiApplication = {
  id: string;
  jobId: string;
  status: string;
  answers?: unknown;
  followUpAt?: string | null;
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
};

type ApiCandidate = {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  portfolioUrl?: string | null;
  notes?: string | null;
  files?: {
    id: string;
    originalName?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
    path: string;
  }[];
  messages?: ApiCandidateMessage[];
  applications?: ApiApplication[];
};

type ApiCandidateMessage = {
  id: string;
  candidateId: string;
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
};

type DataCtx = {
  jobs: Job[];
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
  deleteJob: (id: string) => Promise<void>;
  addCandidate: (c: NewCandidate) => Promise<void>;
  updateCandidate: (id: string, patch: Partial<Candidate>) => Promise<void>;
  sendCandidateMessage: (candidateId: string, channel: CandidateMessageChannel, content: string) => Promise<void>;
  isJobSaved: (id: string) => boolean;
  toggleSavedJob: (id: string) => void;
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
  const { skipAuthRefresh, ...requestInit } = init;
  const bodyIsFormData = init.body instanceof FormData;
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

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
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
  return status === "PUBLISHED" ? "published" : "draft";
}

function toApiJobStatus(status?: JobStatus) {
  if (!status) return undefined;
  return status === "published" ? "PUBLISHED" : "DRAFT";
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
    location: job.location ?? "",
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

function mapCandidate(candidate: ApiCandidate): Candidate | null {
  const application = candidate.applications?.[0];
  const job = application?.job;

  if (!application || !job) return null;

  const answers = asRecord(application.answers);
  const screeningAnswers = parseScreeningAnswers(answers?.screeningAnswers);
  const coverNote = typeof answers?.coverNote === "string" ? answers.coverNote : typeof answers?.text === "string" ? answers.text : "";
  const cvFile = candidate.files?.[0];
  const cvPath = cvFile?.path;
  const uploadedCvUrl = cvFile?.id && cvFile.mimeType !== "text/uri-list" ? `${API_BASE}/admin/candidates/files/${cvFile.id}` : undefined;

  return {
    id: candidate.id,
    applicationId: application.id,
    name: candidate.fullName,
    email: candidate.email ?? "",
    phone: candidate.phone ?? "",
    cvUrl: uploadedCvUrl ?? (cvPath && /^https?:\/\//.test(cvPath) ? cvPath : candidate.portfolioUrl ?? "#"),
    cvFile: cvFile ? {
      id: cvFile.id,
      originalName: cvFile.originalName ?? "CV ứng viên",
      mimeType: cvFile.mimeType ?? "",
      sizeBytes: cvFile.sizeBytes ?? 0,
    } : undefined,
    note: candidate.notes ?? coverNote,
    jobId: job.id,
    jobTitle: job.title,
    status: mapApplicationStatus(application.status),
    appliedAt: formatDate(application.createdAt),
    followUpDate: formatDate(application.followUpAt),
    aiScore: application.matchResult?.score ?? 0,
    aiSummary: application.cvParseResult?.summary ?? "Hồ sơ đang được AI phân tích...",
    strengths: toStringArray(application.matchResult?.strengths),
    risks: toStringArray(application.matchResult?.risks),
    missingReqs: toStringArray(application.matchResult?.missingRequirements),
    screeningAnswers,
    messages: (candidate.messages ?? []).map(mapCandidateMessage),
  };
}

function mapCandidateMessage(message: ApiCandidateMessage): CandidateMessage {
  return {
    id: message.id,
    candidateId: message.candidateId,
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
    salaryRange: job.salary,
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
        apiRequest<ApiCandidate[]>("/admin/candidates"),
      ]);
      setJobs(adminJobs.map(mapJob));
      setCandidates(adminCandidates.map(mapCandidate).filter((candidate): candidate is Candidate => Boolean(candidate)));
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
    });
    await reloadAdminData();
  };

  const updateJob = async (id: string, patch: Partial<Job>) => {
    const current = jobs.find((job) => job.id === id);
    const next = current ? { ...current, ...patch } : patch;

    await apiRequest<ApiJob>(`/admin/jobs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(toJobPayload(next)),
    });
    await reloadAdminData();
  };

  const deleteJob = async (id: string) => {
    await apiRequest<ApiJob>(`/admin/jobs/${id}`, {
      method: "DELETE",
    });
    setJobs((current) => current.filter((job) => job.id !== id));
  };

  const addCandidate = async (candidate: NewCandidate) => {
    const form = new FormData();
    form.set("jobId", candidate.jobId);
    form.set("fullName", candidate.name);
    form.set("email", candidate.email);
    form.set("phone", candidate.phone);
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
    });
    await reloadPublicJobs();
  };

  const updateCandidate = async (id: string, patch: Partial<Candidate>) => {
    const current = candidates.find((candidate) => candidate.id === id);
    if (!current) return;

    await apiRequest(`/admin/candidates/applications/${current.applicationId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: toApiApplicationStatus(patch.status ?? current.status),
        followUpAt: (patch.followUpDate ?? current.followUpDate) || undefined,
        note: patch.note,
      }),
    });
    await reloadAdminData();
  };

  const sendCandidateMessage = async (candidateId: string, channel: CandidateMessageChannel, content: string) => {
    const message = await apiRequest<ApiCandidateMessage>(`/admin/candidates/${candidateId}/messages`, {
      method: "POST",
      body: JSON.stringify({ channel, content }),
    });

    setCandidates((current) => current.map((candidate) => candidate.id === candidateId ? {
      ...candidate,
      messages: [...candidate.messages, mapCandidateMessage(message)],
    } : candidate));
  };

  const isJobSaved = (id: string) => savedJobIds.includes(id);

  const toggleSavedJob = (id: string) =>
    setSavedJobIds((prev) => prev.includes(id) ? prev.filter((savedId) => savedId !== id) : [...prev, id]);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      await apiRequest<ApiAuthSession>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setIsAdminLoggedIn(true);
      await reloadAdminData();
      return { ok: true };
    } catch (error) {
      setIsAdminLoggedIn(false);
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
    }).catch(() => undefined);
    setIsAdminLoggedIn(false);
    setCandidates([]);
    void reloadPublicJobs();
  };

  return (
    <DataContext.Provider value={{ jobs, candidates, isAdminLoggedIn, isAuthReady, isLoading, error, savedJobIds, reloadPublicJobs, reloadAdminData, addJob, updateJob, deleteJob, addCandidate, updateCandidate, sendCandidateMessage, isJobSaved, toggleSavedJob, login, logout }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
