import type { ApplicationStatus as ApiApplicationStatus } from "@hr-copilot/shared";
import { API_BASE } from "@/app/apis/requests";
import type { CandidateStatus } from "@/app/utils/configs/status-config";
import type {
  AiAnalysisStatus,
  AiReviewTone,
  ApiApplication,
  ApiApplicationAnalysis,
  ApiCandidateProfile,
  ApiCvParseStatus,
  Candidate,
  CandidateProfile,
} from "./types";

const API_TO_CANDIDATE_STATUS: Record<ApiApplicationStatus, CandidateStatus> = {
  NEW: "new",
  VIEWED: "viewed",
  CONTACTED: "contacted",
  REPLIED: "replied",
  INTERVIEW: "interview",
  OFFER: "offer",
  OFFER_CLOSED: "offer_closed",
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
    viewed: "VIEWED",
    contacted: "CONTACTED",
    replied: "REPLIED",
    interview: "INTERVIEW",
    offer: "OFFER",
    offer_closed: "OFFER_CLOSED",
    rejected: "REJECTED",
    talent_pool: "TALENT_POOL",
  };
  return statusMap[status];
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
  const aiMetadata = asRecord(application.cvParseResult?.structuredData);
  const aiStatus = mapAiAnalysisStatus(application.cvParseResult?.status);

  return {
    id: application.id,
    applicationId: application.id,
    candidateId: application.candidateId,
    name: application.submittedFullName,
    email: application.submittedEmail ?? "",
    phone: application.submittedPhone ?? "",
    linkedinUrl: application.submittedLinkedinUrl ?? application.candidate?.linkedinUrl ?? "",
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
    appliedAtIso: application.createdAt ?? "",
    followUpDate: formatDate(application.followUpTask?.dueAt),
    aiScore: application.matchResult?.score ?? 0,
    aiStatus,
    aiConfidence: typeof aiMetadata?.confidence === "number" ? aiMetadata.confidence : null,
    aiReview: buildAiReview(aiStatus, aiMetadata),
    aiError: application.cvParseResult?.errorMessage ?? "",
    aiSummary: application.cvParseResult?.summary ?? "Hồ sơ đang được AI phân tích...",
    cvSummary: parseCvSummary(aiMetadata?.cvSummary),
    strengths: toStringArray(application.matchResult?.strengths),
    risks: toStringArray(application.matchResult?.risks),
    missingReqs: toStringArray(application.matchResult?.missingRequirements),
    screeningAnswers,
  };
}

function mapAiAnalysisStatus(status?: ApiCvParseStatus): AiAnalysisStatus {
  if (status === "COMPLETED") return "completed";
  if (status === "FAILED") return "failed";
  return "pending";
}

export function mapApplicationAnalysis(analysis: ApiApplicationAnalysis): Pick<
  Candidate,
  "aiScore" | "aiStatus" | "aiConfidence" | "aiReview" | "aiError" | "aiSummary" | "cvSummary" | "strengths" | "risks" | "missingReqs"
> {
  const status = mapAiAnalysisStatus(analysis.status);
  return {
    aiScore: analysis.matchResult?.score ?? 0,
    aiStatus: status,
    aiConfidence: typeof analysis.confidence === "number" ? analysis.confidence : null,
    aiReview: buildAiReview(status, asRecord(analysis.analysisSignals), analysis.confidence),
    aiError: analysis.errorMessage ?? "",
    aiSummary: analysis.summary ?? "Hồ sơ đang được AI phân tích...",
    cvSummary: analysis.cvSummary ?? null,
    strengths: toStringArray(analysis.matchResult?.strengths),
    risks: toStringArray(analysis.matchResult?.risks),
    missingReqs: toStringArray(analysis.matchResult?.missingRequirements),
  };
}

function buildAiReview(
  status: AiAnalysisStatus,
  metadata: Record<string, unknown> | null,
  fallbackConfidence?: number | null,
): Candidate["aiReview"] {
  if (status === "pending") {
    return {
      label: "Đang đọc CV",
      note: "Kết quả sẽ cập nhật sau khi hệ thống đọc xong CV.",
      tone: "fair",
      signals: [],
    };
  }

  if (status === "failed") {
    return {
      label: "Cần xem thủ công",
      note: "AI chưa đọc được CV này. HR nên mở file CV để đánh giá trực tiếp.",
      tone: "check",
      signals: ["AI lỗi"],
    };
  }

  const confidence = typeof metadata?.confidence === "number"
    ? metadata.confidence
    : typeof fallbackConfidence === "number"
      ? fallbackConfidence
      : null;
  const evidenceCoverage = typeof metadata?.evidenceCoverage === "number" ? metadata.evidenceCoverage : confidence;
  const inputTruncated = metadata?.inputTruncated === true;
  const lowConfidenceOcr = metadata?.lowConfidenceOcr === true;
  const ocrTruncated = metadata?.ocrTruncated === true;
  const aiInput = asRecord(metadata?.aiInput);
  const selectedCharacters = typeof aiInput?.selectedCharacters === "number" ? aiInput.selectedCharacters : null;
  const omittedCharacters = typeof aiInput?.omittedCharacters === "number" ? aiInput.omittedCharacters : null;
  const wasReduced = inputTruncated || ocrTruncated || (selectedCharacters !== null && omittedCharacters !== null && omittedCharacters > selectedCharacters);
  const signals = [
    evidenceCoverage !== null ? `Bằng chứng CV: ${Math.round(evidenceCoverage)}%` : null,
    wasReduced ? "CV đã được lọc gọn" : null,
    lowConfidenceOcr ? "File scan khó đọc" : null,
  ].filter((signal): signal is string => Boolean(signal));

  let tone: AiReviewTone = "good";
  let label = "Đủ dữ liệu";
  let note = "AI có đủ bằng chứng để TA dùng điểm này làm tham khảo nhanh.";

  if (lowConfidenceOcr || (confidence !== null && confidence < 55)) {
    tone = "check";
    label = "Nên kiểm tra CV";
    note = "Dữ liệu đọc từ CV chưa chắc đầy đủ. HR nên mở CV để xác nhận trước khi quyết định.";
  } else if (wasReduced || (confidence !== null && confidence < 80)) {
    tone = "fair";
    label = "Dữ liệu vừa đủ";
    note = "Điểm AI dùng được để sàng lọc nhanh, nhưng nên xem thêm CV ở các yêu cầu quan trọng.";
  }

  return { label, note, tone, signals };
}

export function mapCandidateProfile(candidate: ApiCandidateProfile): CandidateProfile {
  const applications = (candidate.applications ?? []).map(mapCandidate).filter((application): application is Candidate => Boolean(application));

  return {
    id: candidate.id,
    name: candidate.fullName,
    email: candidate.email ?? applications[0]?.email ?? "",
    phone: candidate.phone ?? applications[0]?.phone ?? "",
    linkedinUrl: candidate.linkedinUrl ?? applications[0]?.linkedinUrl ?? "",
    applications,
  };
}

function formatDate(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function parseCvSummary(value: unknown): Candidate["cvSummary"] {
  const record = asRecord(value);
  if (!record) return null;

  const overview = typeof record.overview === "string" ? record.overview.trim() : "";
  if (!overview) return null;

  return {
    overview,
    currentTitle: typeof record.currentTitle === "string" && record.currentTitle.trim() ? record.currentTitle.trim() : null,
    totalExperience: typeof record.totalExperience === "string" && record.totalExperience.trim() ? record.totalExperience.trim() : null,
    keySkills: toStringArray(record.keySkills),
    workExperiences: toWorkExperiences(record.workExperiences),
    workCompanies: toStringArray(record.workCompanies ?? record.companies ?? record.employers),
    workHighlights: toStringArray(record.workHighlights),
    education: toStringArray(record.education),
    languages: toStringArray(record.languages),
    notesForTa: toStringArray(record.notesForTa),
  };
}

function toWorkExperiences(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      const record = asRecord(item);
      const company = typeof record?.company === "string" ? record.company.trim() : "";
      if (!company) return null;
      return {
        company,
        title: typeof record?.title === "string" && record.title.trim() ? record.title.trim() : null,
        duration: typeof record?.duration === "string" && record.duration.trim() ? record.duration.trim() : null,
      };
    })
    .filter((item): item is { company: string; title: string | null; duration: string | null } => Boolean(item));
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function parseScreeningAnswers(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
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
