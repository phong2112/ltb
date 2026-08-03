import type { CriterionEvaluation, MatchCriterion } from "../../../../models/ai";

const MAX_INSIGHTS = 6;
const MAX_EVIDENCE_LENGTH = 240;

export function groundCriterionEvaluations(
  criteria: MatchCriterion[],
  evaluations: CriterionEvaluation[],
  cvText: string,
) {
  const criteriaById = new Map(criteria.map((criterion) => [criterion.id, criterion]));
  const grounded = new Map<string, CriterionEvaluation>();

  for (const evaluation of evaluations) {
    if (!criteriaById.has(evaluation.criterionId) || grounded.has(evaluation.criterionId)) continue;

    const evidence = Array.from(new Set(
      evaluation.evidence
        .map((item) => item.trim().slice(0, MAX_EVIDENCE_LENGTH))
        .filter((item) => item.length >= 3 && isEvidenceInCv(item, cvText)),
    )).slice(0, 3);
    const hasGroundedEvidence = evidence.length > 0;
    const status = evaluation.status === "unknown" || hasGroundedEvidence
      ? evaluation.status
      : "unknown";

    grounded.set(evaluation.criterionId, {
      criterionId: evaluation.criterionId,
      status,
      evidence: status === "unknown" ? [] : evidence,
      reason: status === "unknown" && evaluation.status !== "unknown"
        ? "Không xác minh được bằng chứng do AI cung cấp trong nội dung CV."
        : evaluation.reason.trim().slice(0, 500),
    });
  }

  for (const criterion of criteria) {
    if (grounded.has(criterion.id)) continue;
    grounded.set(criterion.id, {
      criterionId: criterion.id,
      status: "unknown",
      evidence: [],
      reason: "CV không cung cấp đủ thông tin cho tiêu chí này.",
    });
  }

  return grounded;
}

export function buildGroundedMatchInsights(
  criteria: MatchCriterion[],
  evaluations: Map<string, CriterionEvaluation>,
) {
  const strengths = criteria
    .filter((criterion) => evaluations.get(criterion.id)?.status === "met")
    .sort((left, right) => Number(right.required) - Number(left.required))
    .slice(0, MAX_INSIGHTS)
    .map((criterion) => {
      const evidence = evaluations.get(criterion.id)?.evidence[0];
      return evidence
        ? `${criterion.text} — Bằng chứng: “${evidence}”`
        : criterion.text;
    });

  const risks = criteria
    .filter((criterion) => {
      const status = evaluations.get(criterion.id)?.status;
      return criterion.required && (status === "partial" || status === "not_met");
    })
    .slice(0, MAX_INSIGHTS)
    .map((criterion) => {
      const evaluation = evaluations.get(criterion.id);
      const label = evaluation?.status === "partial" ? "Mới đáp ứng một phần" : "Có bằng chứng chưa đáp ứng";
      return `${label}: ${criterion.text}. ${evaluation?.reason ?? ""}`.trim();
    });

  const missingRequirements = criteria
    .filter((criterion) => criterion.required && evaluations.get(criterion.id)?.status !== "met")
    .slice(0, MAX_INSIGHTS)
    .map((criterion) => {
      const status = evaluations.get(criterion.id)?.status;
      const label = status === "partial"
        ? "Cần làm rõ phần còn thiếu"
        : status === "not_met"
          ? "Chưa đáp ứng"
          : "Chưa có bằng chứng";
      return `${label}: ${criterion.text}`;
    });

  const screeningQuestions = criteria
    .filter((criterion) => criterion.required && evaluations.get(criterion.id)?.status !== "met")
    .slice(0, MAX_INSIGHTS)
    .map((criterion) => `Bạn có thể chia sẻ bằng chứng hoặc ví dụ cụ thể liên quan đến yêu cầu “${criterion.text}” không?`);

  return { strengths, risks, missingRequirements, screeningQuestions };
}

function isEvidenceInCv(evidence: string, cvText: string) {
  const normalizedEvidence = normalizeForComparison(evidence);
  if (normalizedEvidence.length < 3) return false;
  return normalizeForComparison(cvText).includes(normalizedEvidence);
}

function normalizeForComparison(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("vi")
    .replace(/[“”"'`]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}
