import { useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiRequestError, apiRequest } from "@/app/services/api-client";
import {
  DataContext,
  SAVED_JOBS_STORAGE_KEY,
  mapApplicationAnalysis,
  mapCandidateMessage,
  mapCandidateProfile,
  mapJob,
  readSavedJobIds,
  toApiApplicationStatus,
  toJobPayload,
  type ApiAuthSession,
  type ApiApplicationAnalysis,
  type ApiCandidateMessage,
  type ApiCandidateProfile,
  type ApiJob,
  type Candidate,
  type CandidateMessageChannel,
  type CandidateProfile,
  type Job,
  type JobInput,
  type LoginResult,
  type NewCandidate,
} from "@/app/data-model";

export type {
  Candidate,
  CandidateMessageChannel,
  CandidateProfile,
  CandidateStatus,
  Job,
  JobStatus,
} from "@/app/data-model";

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
      const [adminJobs, adminCandidates] = await Promise.all([apiRequest<ApiJob[]>("/admin/jobs"), apiRequest<ApiCandidateProfile[]>("/admin/candidates")]);
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

  const refreshCandidateAnalysis = useCallback(async (applicationId: string) => {
    const analysis = await apiRequest<ApiApplicationAnalysis>(
      `/admin/candidates/applications/${applicationId}/analysis`,
    );
    const patch = mapApplicationAnalysis(analysis);

    if (patch.aiStatus === "pending") return patch.aiStatus;

    setCandidates(current => current.map(candidate =>
      candidate.applicationId === applicationId ? { ...candidate, ...patch } : candidate,
    ));
    setCandidateProfiles(current => current.map(profile => ({
      ...profile,
      applications: profile.applications.map(application =>
        application.applicationId === applicationId ? { ...application, ...patch } : application,
      ),
    })));

    return patch.aiStatus;
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

  const addJob = async (job: JobInput) => {
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

    if (candidate.questionAnswers?.length) {
      form.set("questionAnswers", JSON.stringify(candidate.questionAnswers));
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
    const current = candidates.find(candidate => candidate.id === id);
    if (!current) return;

    const body: { status?: string; followUpAt?: string | null; note?: string } = {};

    if (patch.status !== undefined) {
      body.status = toApiApplicationStatus(patch.status);
    }

    if (patch.hrNote !== undefined) {
      body.note = patch.hrNote;
    }

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

    setCandidates(current =>
      current.map(candidate =>
        candidate.applicationId === applicationId
          ? {
              ...candidate,
              messages: [...candidate.messages, mapCandidateMessage(message)],
            }
          : candidate,
      ),
    );
    setCandidateProfiles(current =>
      current.map(profile => ({
        ...profile,
        applications: profile.applications.map(application =>
          application.applicationId === applicationId
            ? {
                ...application,
                messages: [...application.messages, mapCandidateMessage(message)],
              }
            : application,
        ),
      })),
    );
  };

  const isJobSaved = (id: string) => savedJobIds.includes(id);

  const toggleSavedJob = (id: string) => {
    const willBeSaved = !savedJobIds.includes(id);
    setSavedJobIds(prev => (prev.includes(id) ? prev.filter(savedId => savedId !== id) : [...prev, id]));
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
    <DataContext.Provider
      value={{
        jobs,
        candidateProfiles,
        candidates,
        isAdminLoggedIn,
        isAuthReady,
        isLoading,
        error,
        savedJobIds,
        reloadPublicJobs,
        reloadAdminData,
        refreshCandidateAnalysis,
        addJob,
        updateJob,
        addCandidate,
        updateCandidate,
        sendCandidateMessage,
        isJobSaved,
        toggleSavedJob,
        login,
        logout,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
