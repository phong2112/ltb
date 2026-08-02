import type { JobStatus } from "@/app/utils/configs/status-config";
import type { ApiJob, Job, JobQuestion } from "./types";

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

function mapJobQuestion(question: NonNullable<ApiJob["questions"]>[number]): JobQuestion {
  return {
    id: question.id,
    label: question.label ?? "",
    required: Boolean(question.required),
    sortOrder: question.sortOrder ?? 0,
  };
}

function normalizeJobLocations(locations: string[]) {
  const normalized = locations
    .map((location) => location.trim())
    .map((location) => (location === "TP. Hồ Chí Minh" ? "TP Hồ Chí Minh" : location))
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

function formatJobLocations(locations: string[]) {
  return locations.length > 0 ? locations.join(", ") : "";
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

