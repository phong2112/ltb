import type { CriterionEvaluation, CriterionStatus, MatchCriterion } from "@/models/ai";

const MAX_MATCH_CRITERIA = 15;
const PROSE_LINE_LENGTH = 140;
const OPTIONAL_CRITERION_PATTERN = /(lợi thế|loi the|ưu tiên|uu tien|khuyến khích|khuyen khich|là một điểm cộng|la mot diem cong|điểm cộng|diem cong|nice[ -]?to[ -]?have|preferred|plus\b)/i;
const REQUIRED_CRITERION_PATTERN = /(bắt buộc|bat buoc|yêu cầu|yeu cau|tối thiểu|toi thieu|ít nhất|it nhat|minimum|required|must\b)/i;
const CRITICAL_CRITERION_PATTERN = /(bắt buộc|bat buoc|điều kiện tiên quyết|dieu kien tien quyet|không phù hợp nếu|khong phu hop neu|loại nếu|loai neu|must[ -]?have|mandatory|required|license|licence|chứng chỉ bắt buộc|chung chi bat buoc|giấy phép hành nghề|giay phep hanh nghe|visa|work permit|security clearance)/i;
const QUANTITATIVE_CRITERION_PATTERN = /(?:\d+\+?\s*(?:năm|nam|years?|yrs?)|(?:tối thiểu|toi thieu|ít nhất|it nhat|minimum)\s+\d+)/i;
const SOFT_SKILL_CRITERION_PATTERN = /(giao tiếp|giao tiep|làm việc nhóm|lam viec nhom|lắng nghe|lang nghe|coaching|huấn luyện|huan luyen|phân tích lỗi|phan tich loi|storytelling|thẩm mỹ|tham my|chú trọng chi tiết|chu trong chi tiet|stakeholder|communication|teamwork|detail|analytical)/i;
const DOMAIN_CRITERION_PATTERN = /(fintech|payment|saas|startup|e-?commerce|thương mại điện tử|thuong mai dien tu|healthcare|banking|retail|domain)/i;
const HARD_SKILL_CRITERION_PATTERN = /(react|typescript|next\.?js|node\.?js|nestjs|swiftui?|figma|selenium|playwright|cypress|postgresql|mysql|mongodb|kubernetes|docker|terraform|aws|api|rest|graphql|ci\/cd|tailwind|python|sql|tableau|power bi)/i;

export function extractMatchCriteria(requirements: string): MatchCriterion[] {
  const lines = requirements
    .split(/\n+/)
    .flatMap(splitCriterionLine)
    .map(normalizeCriterionLine);
  const includedLines: string[] = [];
  let includeSection = true;

  for (const line of lines) {
    const section = classifySectionHeading(line);
    if (section) {
      if (section !== "neutral") includeSection = section === "requirements";
      continue;
    }
    if (includeSection && line.length >= 3 && !isBoilerplate(line)) includedLines.push(line);
  }

  const uniqueLines = Array.from(
    new Map(includedLines.map((line) => [line.toLocaleLowerCase("vi"), line])).values(),
  ).slice(0, MAX_MATCH_CRITERIA);

  return uniqueLines.map((text, index) => {
    const preferred = OPTIONAL_CRITERION_PATTERN.test(text);
    const critical = !preferred && CRITICAL_CRITERION_PATTERN.test(text);
    const required = critical || REQUIRED_CRITERION_PATTERN.test(text) || !preferred;
    const importance = critical ? "critical" : required ? "required" : "preferred";
    const constraintType = classifyConstraintType(text);

    return {
      id: `criterion-${index + 1}`,
      text,
      importance,
      constraintType,
      required,
      blocker: critical,
      weight: criterionWeight(importance),
    };
  });
}

function splitCriterionLine(rawLine: string) {
  const line = rawLine.trim();
  if (!line) return [];

  const isProse = line.length >= PROSE_LINE_LENGTH;
  const hasInlineSeparators = /[;•]/u.test(line);
  if (!isProse && !hasInlineSeparators) return [line];

  const separator = isProse ? /(?:[;•]+|(?<=[.!?])\s+)/u : /[;•]+/u;
  return line.split(separator).map((part) => part.trim()).filter(Boolean);
}

export function calculateMatchScore(criteria: MatchCriterion[], evaluations: Map<string, CriterionEvaluation>) {
  const rawScore = calculateWeightedScore(criteria, evaluations);
  return applyScoreCaps(rawScore, criteria, evaluations);
}

function calculateWeightedScore(criteria: MatchCriterion[], evaluations: Map<string, CriterionEvaluation>) {
  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (totalWeight === 0) return 0;

  const earnedWeight = criteria.reduce((sum, criterion) => {
    const factor = statusScore(evaluations.get(criterion.id)?.status ?? "unknown");
    return sum + criterion.weight * factor;
  }, 0);

  return Math.round((earnedWeight / totalWeight) * 100);
}

function applyScoreCaps(
  score: number,
  criteria: MatchCriterion[],
  evaluations: Map<string, CriterionEvaluation>,
) {
  const criticalStatuses = criteria
    .filter((criterion) => criterion.importance === "critical" || criterion.blocker)
    .map((criterion) => evaluations.get(criterion.id)?.status ?? "unknown");

  if (criticalStatuses.some((status) => status === "not_met" || status === "unknown")) {
    return Math.min(score, 55);
  }

  if (criticalStatuses.some((status) => status === "partial")) {
    return Math.min(score, 75);
  }

  const requiredStatuses = criteria
    .filter((criterion) => criterion.required)
    .map((criterion) => evaluations.get(criterion.id)?.status ?? "unknown");

  if (requiredStatuses.some((status) => status === "not_met")) return Math.min(score, 70);
  if (requiredStatuses.some((status) => status === "unknown")) return Math.min(score, 80);
  if (hasPartialQuantitativeRequired(criteria, evaluations)) return Math.min(score, 85);

  return score;
}

export function calculateConfidence(criteria: MatchCriterion[], evaluations: Map<string, CriterionEvaluation>) {
  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (totalWeight === 0) return 0;

  const knownWeight = criteria.reduce((sum, criterion) => {
    return evaluations.get(criterion.id)?.status === "unknown" ? sum : sum + criterion.weight;
  }, 0);

  return Math.round((knownWeight / totalWeight) * 100);
}

export function calculatePotentialMatchScore(
  criteria: MatchCriterion[],
  evaluations: Map<string, CriterionEvaluation>,
) {
  const optimisticEvaluations = new Map(
    criteria.map((criterion) => {
      const evaluation = evaluations.get(criterion.id);
      return [
        criterion.id,
        evaluation?.status === "unknown"
          ? { ...evaluation, status: "met" as const }
          : evaluation,
      ];
    }),
  );

  return calculateMatchScore(
    criteria,
    optimisticEvaluations as Map<string, CriterionEvaluation>,
  );
}

function statusScore(status: CriterionStatus) {
  if (status === "met") return 1;
  if (status === "partial") return 0.5;
  return 0;
}

function criterionWeight(importance: MatchCriterion["importance"]) {
  if (importance === "critical") return 4;
  if (importance === "required") return 2;
  return 1;
}

function classifyConstraintType(text: string): MatchCriterion["constraintType"] {
  if (QUANTITATIVE_CRITERION_PATTERN.test(text)) return "quantitative";
  if (SOFT_SKILL_CRITERION_PATTERN.test(text)) return "soft_skill";
  if (DOMAIN_CRITERION_PATTERN.test(text)) return "domain";
  if (HARD_SKILL_CRITERION_PATTERN.test(text)) return "hard_skill";
  return "general";
}

function hasPartialQuantitativeRequired(
  criteria: MatchCriterion[],
  evaluations: Map<string, CriterionEvaluation>,
) {
  return criteria.some((criterion) => (
    criterion.required
    && criterion.constraintType === "quantitative"
    && evaluations.get(criterion.id)?.status === "partial"
  ));
}

function normalizeCriterionLine(line: string) {
  return line
    .replace(/^\s*[-*•]\s+/, "")
    .replace(/^\s*\d+[.)]\s+/, "")
    .replace(/&amp;/g, "&")
    .trim();
}

function classifySectionHeading(line: string): "requirements" | "excluded" | "neutral" | undefined {
  const normalized = line
    .replace(/:$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("vi");

  if (!normalized) return "neutral";

  if (REQUIREMENT_SECTION_HEADINGS.has(normalized)) return "requirements";
  if (EXCLUDED_SECTION_HEADINGS.has(normalized)) return "excluded";

  const wordCount = normalized.split(/\s+/).length;
  return line.endsWith(":") && wordCount <= 6 ? "neutral" : undefined;
}

function isBoilerplate(line: string) {
  return /^(?:apply|ứng tuyển|liên hệ|send (?:your )?cv|nộp (?:hồ sơ|cv)|salary|mức lương)\b/iu.test(line);
}

const EXCLUDED_SECTION_HEADINGS = new Set([
  "benefits",
  "job description",
  "job duties",
  "key responsibilities",
  "responsibilities",
  "công việc",
  "mô tả công việc",
  "nhiệm vụ",
  "phúc lợi",
  "quyền lợi",
  "trách nhiệm",
]);

const REQUIREMENT_SECTION_HEADINGS = new Set([
  "experience",
  "job requirements",
  "must have",
  "nice to have",
  "preferred qualifications",
  "qualifications",
  "requirements",
  "soft skills",
  "technical skills",
  "tools & development practices",
  "tools and development practices",
  "kỹ năng",
  "kỹ năng chuyên môn",
  "kỹ năng mềm",
  "trình độ",
  "yêu cầu",
  "yêu cầu công việc",
  "yêu cầu ứng viên",
]);
