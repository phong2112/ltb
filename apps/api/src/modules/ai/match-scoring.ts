import type { CriterionEvaluation, CriterionStatus, MatchCriterion } from "./ai.types";

export function extractMatchCriteria(requirements: string): MatchCriterion[] {
  const lines = requirements
    .split(/\n+/)
    .map(normalizeCriterionLine)
    .filter((line) => line.length >= 3 && !isSectionHeading(line));
  const uniqueLines = Array.from(new Map(lines.map((line) => [line.toLocaleLowerCase("vi"), line])).values()).slice(0, 12);

  return uniqueLines.map((text, index) => {
    const required = !/(lợi thế|ưu tiên|khuyến khích|nice[ -]?to[ -]?have|preferred|plus\b)/i.test(text);

    return {
      id: `criterion-${index + 1}`,
      text,
      required,
      weight: required ? 2 : 1,
    };
  });
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
    .toLocaleLowerCase("en");

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
]);
