import type { CriterionEvaluation, CriterionStatus, MatchCriterion } from "./ai.types";

const MAX_MATCH_CRITERIA = 15;
const PROSE_LINE_LENGTH = 140;
const OPTIONAL_CRITERION_PATTERN = /(lợi thế|ưu tiên|khuyến khích|là một điểm cộng|điểm cộng|nice[ -]?to[ -]?have|preferred|plus\b)/i;
const REQUIRED_CRITERION_PATTERN = /(bắt buộc|yêu cầu|tối thiểu|ít nhất|minimum|required|must\b)/i;

export function extractMatchCriteria(requirements: string): MatchCriterion[] {
  const lines = requirements
    .split(/\n+/)
    .flatMap(splitCriterionLine)
    .map(normalizeCriterionLine)
    .filter((line) => line.length >= 3 && !isSectionHeading(line));
  const uniqueLines = Array.from(
    new Map(lines.map((line) => [line.toLocaleLowerCase("vi"), line])).values(),
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

function isSectionHeading(line: string) {
  const normalized = line
    .replace(/:$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("vi");

  if (!normalized) return true;

  if (SECTION_HEADINGS.has(normalized)) return true;

  const wordCount = normalized.split(/\s+/).length;
  return line.endsWith(":") && wordCount <= 6;
}

const SECTION_HEADINGS = new Set([
  "benefits",
  "experience",
  "job requirements",
  "key responsibilities",
  "must have",
  "nice to have",
  "preferred qualifications",
  "qualifications",
  "requirements",
  "responsibilities",
  "soft skills",
  "technical skills",
  "tools & development practices",
  "tools and development practices",
  "công việc",
  "kỹ năng",
  "kỹ năng chuyên môn",
  "kỹ năng mềm",
  "mô tả công việc",
  "nhiệm vụ",
  "phúc lợi",
  "quyền lợi",
  "trách nhiệm",
  "trình độ",
  "yêu cầu",
  "yêu cầu công việc",
  "yêu cầu ứng viên",
]);
