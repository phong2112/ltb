import { createHash } from "crypto";
import type { SourcingJobInput } from "@/modules/sourcing/search";

export const SOURCING_SCORING_VERSION = "sourcing-v2";

export function normalizeSourcingText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("vi")
    .replace(/\s+/gu, " ")
    .trim();
}

export function includesSourcingSignal(normalizedEvidence: string, signal: string) {
  const normalizedSignal = normalizeSourcingText(signal);
  if (normalizedSignal.length < 2) return false;

  const escaped = normalizedSignal.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "u")
    .test(normalizedEvidence);
}

export function sourcingJobFingerprint(job: SourcingJobInput) {
  const snapshot = JSON.stringify({
    title: job.title.trim(),
    level: job.level?.trim() || null,
    locations: [...job.locations].map(value => value.trim()).sort(),
    tags: [...job.tags].map(value => value.trim()).sort(),
    description: job.description.trim(),
    requirements: job.requirements.trim(),
  });
  return createHash("sha256").update(snapshot).digest("hex").slice(0, 16);
}
