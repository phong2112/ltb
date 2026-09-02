import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  ApiRequestError,
  createJobRequest,
  deleteCandidateRequest,
  getAdminCandidates,
  getAdminJobs,
  getApplicationAnalysis,
  getAuthSession,
  getPublicJobs,
  loginRequest,
  logoutRequest,
  retryApplicationAnalysis,
  submitApplication,
  updateCandidateApplication,
  updateJobRequest,
} from "@/app/apis/requests";
import { SAVED_JOBS_STORAGE_KEY, readSavedJobIds } from "@/app/services/saved-jobs.service";
import { actionNotifications, runNotifiedAction } from "@/app/services/action-notifications";
import {
  mapApplicationAnalysis,
  mapCandidateProfile,
  toApiApplicationStatus,
  type AiAnalysisStatus,
  type Candidate,
  type CandidateProfile,
  type CandidateStatus,
  type NewCandidate,
} from "./candidates";
import { type LoginResult } from "./auth";
import {
  mapJob,
  type Job,
  type JobInput,
} from "./jobs";

export type DataCtx = {
  jobs: Job[];
  candidateProfiles: CandidateProfile[];
  candidates: Candidate[];
  isAdminLoggedIn: boolean;
  isAuthReady: boolean;
  isLoading: boolean;
  error: string;
  savedJobIds: string[];
  reloadPublicJobs: () => Promise<void>;
  reloadAdminData: (status?: CandidateStatus) => Promise<void>;
  refreshCandidateAnalysis: (applicationId: string) => Promise<AiAnalysisStatus>;
  retryCandidateAnalysis: (applicationId: string) => Promise<AiAnalysisStatus>;
  addJob: (j: JobInput) => Promise<void>;
  updateJob: (id: string, patch: Partial<Job>) => Promise<void>;
  addCandidate: (c: NewCandidate) => Promise<void>;
  updateCandidate: (id: string, patch: Partial<Candidate>) => Promise<void>;
  deleteCandidate: (id: string) => Promise<void>;
  isJobSaved: (id: string) => boolean;
  toggleSavedJob: (id: string) => boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
};

const DataContext = createContext<DataCtx>(null!);

export type {
  Candidate,
  CandidateProfile,
  CandidateStatus,
  CvSummary,
} from "./candidates";
export type { ApiJob, Job, JobStatus } from "./jobs";

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
      const data = await getPublicJobs();
      setJobs(data.map(mapJob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu việc làm");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reloadAdminData = useCallback(async (status?: CandidateStatus) => {
    setError("");
    setIsLoading(true);

    try {
      const apiStatus = toApiApplicationStatus(status);
      const query = apiStatus ? `?status=${encodeURIComponent(apiStatus)}` : "";
      const [adminJobs, adminCandidates] = await Promise.all([
        getAdminJobs(),
        getAdminCandidates(query),
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

  const patchCandidateAnalysis = useCallback((
    applicationId: string,
    patch: ReturnType<typeof mapApplicationAnalysis>,
  ) => {
    setCandidates(current => current.map(candidate =>
      candidate.applicationId === applicationId ? { ...candidate, ...patch } : candidate,
    ));
    setCandidateProfiles(current => current.map(profile => ({
      ...profile,
      applications: profile.applications.map(application =>
        application.applicationId === applicationId ? { ...application, ...patch } : application,
      ),
    })));
  }, []);

  const refreshCandidateAnalysis = useCallback(async (applicationId: string) => {
    const analysis = await getApplicationAnalysis(applicationId);
    const patch = mapApplicationAnalysis(analysis);

    if (patch.aiStatus === "pending") return patch.aiStatus;

    patchCandidateAnalysis(applicationId, patch);

    return patch.aiStatus;
  }, [patchCandidateAnalysis]);

  const retryCandidateAnalysis = useCallback(async (applicationId: string) => {
    const analysis = await runNotifiedAction(actionNotifications.candidates.retryAnalysis, () => retryApplicationAnalysis(applicationId));
    const patch = mapApplicationAnalysis(analysis);

    patchCandidateAnalysis(applicationId, patch);
    return patch.aiStatus;
  }, [patchCandidateAnalysis]);

  useEffect(() => {
    void reloadPublicJobs();
  }, [reloadPublicJobs]);

  useEffect(() => {
    async function loadAuthSession() {
      try {
        await getAuthSession();
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
    await runNotifiedAction(actionNotifications.jobs.create, () => createJobRequest(job));
    await reloadAdminData();
  };

  const updateJob = async (id: string, patch: Partial<Job>) => {
    await runNotifiedAction(actionNotifications.jobs.update, () => updateJobRequest(id, patch));
    await reloadAdminData();
  };

  const addCandidate = async (candidate: NewCandidate) => {
    await runNotifiedAction(actionNotifications.applications.submit, () => submitApplication(candidate));
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

    const silentViewedUpdate =
      current.status === "new" &&
      patch.status === "viewed" &&
      patch.hrNote === undefined &&
      patch.followUpDate === undefined;

    const request = () => updateCandidateApplication(current.applicationId, body);
    if (silentViewedUpdate) await request();
    else await runNotifiedAction(actionNotifications.candidates.update, request);
    await reloadAdminData();
  };

  const deleteCandidate = async (id: string) => {
    await runNotifiedAction(actionNotifications.candidates.delete, () => deleteCandidateRequest(id));
    await reloadAdminData();
  };

  const isJobSaved = (id: string) => savedJobIds.includes(id);

  const toggleSavedJob = (id: string) => {
    const willBeSaved = !savedJobIds.includes(id);
    setSavedJobIds(prev => (prev.includes(id) ? prev.filter(savedId => savedId !== id) : [...prev, id]));
    return willBeSaved;
  };

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      await runNotifiedAction(actionNotifications.auth.login, () => loginRequest(email, password));
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
    await runNotifiedAction(actionNotifications.auth.logout, logoutRequest).catch(() => undefined);
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
        retryCandidateAnalysis,
        addJob,
        updateJob,
        addCandidate,
        updateCandidate,
        deleteCandidate,
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
