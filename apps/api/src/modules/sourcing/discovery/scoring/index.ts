import type { SourcingJobInput } from "@/modules/sourcing/search";
import type { LinkedinDiscoveryResult, LinkedinPotentialScore } from "@/modules/sourcing/discovery/types";
import { includesSourcingSignal, normalizeSourcingText } from "@/modules/sourcing/scoring/signals";

export function scoreLinkedinDiscoveryResult(
  result: LinkedinDiscoveryResult,
  job: SourcingJobInput,
): LinkedinPotentialScore {
  const evidence = normalizeSourcingText(`${result.displayName ?? ""} ${result.headline ?? ""} ${result.snippet}`);
  const titleSignals = buildTitleSignals(job.title);
  const skillSignals = job.tags.map((tag) => tag.trim()).filter(Boolean).slice(0, 8);
  const locationSignals = job.locations.map((location) => location.trim()).filter(Boolean).slice(0, 4);
  const senioritySignals = job.level ? [job.level] : [];
  const positiveSignals = [...titleSignals, ...skillSignals, ...locationSignals, ...senioritySignals];
  const matchedSignals = unique(positiveSignals.filter((signal) => includesSourcingSignal(evidence, signal))).slice(0, 8);
  const missingSignals = unique([...skillSignals, ...senioritySignals].filter((signal) => !includesSourcingSignal(evidence, signal))).slice(0, 5);

  let score = 35;
  score += countMatches(evidence, titleSignals) * 14;
  score += countMatches(evidence, skillSignals) * 9;
  score += countMatches(evidence, locationSignals) * 8;
  score += countMatches(evidence, senioritySignals) * 8;
  score -= missingSignals.length * 3;

  const boundedScore = Math.max(20, Math.min(92, score));
  const confidence = matchedSignals.length >= 4 ? "MEDIUM" : "LOW";

  return {
    score: boundedScore,
    confidence,
    matchedSignals,
    missingSignals,
    reason: confidence === "MEDIUM"
      ? "Snippet công khai có nhiều tín hiệu gần JD; cần TA mở LinkedIn để xác minh chi tiết."
      : "Snippet công khai còn ít dữ liệu; chỉ nên xem là ứng viên tiềm năng cần kiểm tra thêm.",
  };
}

function buildTitleSignals(title: string) {
  const normalizedTitle = title.trim();
  const signals = [normalizedTitle];
  if (/tester|qa|quality/i.test(title)) signals.push("QA", "Tester", "Quality Engineer", "SDET");
  if (/frontend|front-end/i.test(title)) signals.push("Frontend", "Front End", "Web Developer");
  if (/backend|back-end/i.test(title)) signals.push("Backend", "Software Engineer");
  if (/full.?stack/i.test(title)) signals.push("Full Stack", "Software Engineer");
  if (/ai|machine learning|ml/i.test(title)) signals.push("AI Engineer", "Machine Learning", "ML Engineer");
  if (/recruit|talent acquisition|\bta\b/i.test(title)) signals.push("Recruiter", "Talent Acquisition", "Talent Partner");
  return unique(signals.filter(Boolean));
}

function countMatches(evidence: string, signals: string[]) {
  return unique(signals).filter((signal) => includesSourcingSignal(evidence, signal)).length;
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
