import type { ApplicationStatus as ApiApplicationStatus } from "@hr-copilot/shared";
import { API_BASE } from "@/app/services/api-client";
import type { CandidateStatus, JobStatus } from "@/app/status-config";
import type {
  ApiApplication,
  ApiCandidateMessage,
  ApiCandidateProfile,
  ApiJob,
  Candidate,
  CandidateMessage,
  CandidateMessageChannel,
  CandidateProfile,
  Job,
  JobQuestion,
} from "@/app/data-types";

export type {
  ApiAuthSession,
  ApiCandidateMessage,
  ApiCandidateProfile,
  ApiJob,
  Candidate,
  CandidateMessage,
  CandidateMessageChannel,
  CandidateProfile,
  CandidateStatus,
  Job,
  JobInput,
  JobStatus,
  LoginResult,
  NewCandidate,
} from "@/app/data-types";
export { DataContext, SAVED_JOBS_STORAGE_KEY, readSavedJobIds } from "@/app/data-types";

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

const API_TO_CANDIDATE_STATUS: Record<ApiApplicationStatus, CandidateStatus> = {
  NEW: "new",
  REVIEWING: "reviewing",
  CONTACTED: "contacted",
  REPLIED: "replied",
  SCREENING: "screening",
  INTERVIEW: "interview",
  OFFER: "offer",
  REJECTED: "rejected",
  TALENT_POOL: "talent_pool",
};

function mapApplicationStatus(status: ApiApplicationStatus): CandidateStatus {
  return API_TO_CANDIDATE_STATUS[status];
}

export function toApiApplicationStatus(status?: CandidateStatus): ApiApplicationStatus | undefined {
  if (!status) return undefined;
  const statusMap: Record<CandidateStatus, ApiApplicationStatus> = {
    new: "NEW",
    reviewing: "REVIEWING",
    contacted: "CONTACTED",
    replied: "REPLIED",
    screening: "SCREENING",
    interview: "INTERVIEW",
    offer: "OFFER",
    rejected: "REJECTED",
    talent_pool: "TALENT_POOL",
  };
  return statusMap[status];
}

export function mapJob(job: ApiJob): Job {
  const locations = normalizeJobLocations(job.locations ?? (job.location ? [job.location] : []));

  return {
    id: job.id,
    title: job.title,
    company: job.company ?? job.department ?? "Lường Bích TA",
    locations,
    location: formatJobLocations(locations),
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
    questions: (job.questions ?? []).map(mapJobQuestion),
  };
}

function mapJobQuestion(question: NonNullable<ApiJob["questions"]>[number]): JobQuestion {
  return {
    id: question.id,
    label: question.label ?? "",
    required: Boolean(question.required),
    sortOrder: question.sortOrder ?? 0,
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
    cvUrl: uploadedCvUrl ?? (cvPath && /^https?:\/\//.test(cvPath) ? cvPath : (application.submittedPortfolioUrl ?? "#")),
    cvFile: cvFile
      ? {
          id: cvFile.id,
          originalName: cvFile.originalName ?? "CV ứng viên",
          mimeType: cvFile.mimeType ?? "",
          sizeBytes: cvFile.sizeBytes ?? 0,
        }
      : undefined,
    coverNote: application.coverNote ?? legacyCoverNote,
    hrNote: application.hrNotes ?? "",
    jobId: job.id,
    jobTitle: job.title,
    status: mapApplicationStatus(application.status),
    appliedAt: formatDate(application.createdAt),
    followUpDate: formatDate(application.followUpTask?.dueAt),
    screeningAnswers,
    messages: (application.messages ?? []).map(mapCandidateMessage),
  };
}

export function mapCandidateProfile(candidate: ApiCandidateProfile): CandidateProfile {
  const applications = (candidate.applications ?? []).map(mapCandidate).filter((application): application is Candidate => Boolean(application));

  return {
    id: candidate.id,
    name: candidate.fullName,
    email: candidate.email ?? applications[0]?.email ?? "",
    phone: candidate.phone ?? applications[0]?.phone ?? "",
    applications,
  };
}

export function mapCandidateMessage(message: ApiCandidateMessage): CandidateMessage {
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

export function toJobPayload(job: Partial<Job>) {
  return {
    title: job.title,
    company: job.company,
    locations: job.locations,
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
    questions: job.questions?.map((question, index) => ({
      label: question.label,
      required: question.required,
      sortOrder: question.sortOrder ?? index,
    })),
  };
}

function normalizeJobLocations(locations: string[]) {
  const normalized = locations
    .map(location => location.trim())
    .map(location => (location === "TP. Hồ Chí Minh" ? "TP Hồ Chí Minh" : location))
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

function formatJobLocations(locations: string[]) {
  return locations.length > 0 ? locations.join(", ") : "";
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

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function parseScreeningAnswers(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.flatMap(item => {
    const record = asRecord(item);
    const q = typeof record?.q === "string" ? record.q : record?.question;
    const a = typeof record?.a === "string" ? record.a : record?.answer;
    const required = record?.required;

    return typeof q === "string" && typeof a === "string"
      ? [
          {
            q,
            a,
            required: typeof required === "boolean" ? required : undefined,
          },
        ]
      : [];
  });
}
