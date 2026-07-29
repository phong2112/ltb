import type { CriterionEvaluation, CriterionStatus, MatchCriterion } from "./ai.types";

const MAX_MATCH_CRITERIA = 15;
const PROSE_LINE_LENGTH = 140;
const OPTIONAL_CRITERION_PATTERN = /(lợi thế|ưu tiên|khuyến khích|là một điểm cộng|điểm cộng|nice[ -]?to[ -]?have|preferred|plus\b)/i;
const REQUIRED_CRITERION_PATTERN = /(bắt buộc|yêu cầu|tối thiểu|ít nhất|minimum|required|must\b)/i;

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
    const required = REQUIRED_CRITERION_PATTERN.test(text)
      || !OPTIONAL_CRITERION_PATTERN.test(text);

    return {
      id: `criterion-${index + 1}`,
      text,
      required,
      weight: required ? 2 : 1,
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
  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (totalWeight === 0) return 0;

  const earnedWeight = criteria.reduce((sum, criterion) => {
    const factor = statusScore(evaluations.get(criterion.id)?.status ?? "unknown");
    return sum + criterion.weight * factor;
  }, 0);

  return Math.round((earnedWeight / totalWeight) * 100);
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

function normalizeCriterionLine(line: string) {
  return line
    .replace(/^[-*•\d.)\s]+/, "")
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
