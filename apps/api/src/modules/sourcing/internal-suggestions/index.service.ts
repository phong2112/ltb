import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { PrismaService } from "@/modules/prisma";
import type { SourcingJobInput } from "@/modules/sourcing/search";
import {
  includesSourcingSignal,
  normalizeSourcingText,
  sourcingJobFingerprint,
  SOURCING_SCORING_VERSION,
} from "@/modules/sourcing/scoring/signals";

const MAX_INTERNAL_SUGGESTIONS = 30;
const INTERNAL_SCAN_PAGE_SIZE = 200;
const INTERNAL_SHORTLIST_BUFFER = MAX_INTERNAL_SUGGESTIONS * 4;

type InternalSuggestion = {
  candidateId: string;
  profileUrl: string;
  normalizedProfileUrl: string;
  displayName: string;
  headline?: string;
  location?: string;
  sourceKind: "talent_pool" | "previous_application";
  sourceId: string;
  potential: InternalPotentialScore;
};

type InternalPotentialScore = {
  score: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  matchedSignals: string[];
  missingSignals: string[];
  reason: string;
};

@Injectable()
export class InternalCandidateSuggestionService {
  async suggestAndStore(prisma: PrismaService, campaignId: string, job: SourcingJobInput & { id?: string }) {
    const suggestions = await this.buildSuggestions(prisma, job);
    const normalizedUrls = suggestions.map((suggestion) => suggestion.normalizedProfileUrl);

    if (!normalizedUrls.length) {
      return {
        createdCount: 0,
        duplicateCount: 0,
        resultCount: 0,
        profiles: await this.listProfiles(prisma, campaignId),
      };
    }

    const existing = await prisma.sourcedProfile.findMany({
      where: { campaignId, normalizedProfileUrl: { in: normalizedUrls } },
      select: { normalizedProfileUrl: true },
    });
    const existingSet = new Set(existing.map((item) => item.normalizedProfileUrl));
    const toCreate = suggestions.filter((suggestion) => !existingSet.has(suggestion.normalizedProfileUrl));
    const toRefresh = suggestions.filter((suggestion) => existingSet.has(suggestion.normalizedProfileUrl));

    await Promise.all(toRefresh.map((suggestion) => prisma.sourcedProfile.updateMany({
      where: { campaignId, normalizedProfileUrl: suggestion.normalizedProfileUrl },
      data: sourcedProfileRefreshData(suggestion, job),
    })));

    const created = await prisma.sourcedProfile.createMany({
      data: toCreate.map((suggestion) => sourcedProfileCreateData(campaignId, suggestion, job)),
      skipDuplicates: true,
    });

    return {
      createdCount: created.count,
      duplicateCount: normalizedUrls.length - created.count,
      resultCount: normalizedUrls.length,
      profiles: await this.listProfiles(prisma, campaignId),
    };
  }

  private async buildSuggestions(prisma: PrismaService, job: SourcingJobInput & { id?: string }) {
    const byCandidateId = new Map<string, InternalSuggestion>();
    let poolCursor: string | undefined;

    while (true) {
      const poolEntries = await prisma.talentPoolEntry.findMany({
        where: {
          promotedApplication: job.id ? { isNot: { jobId: job.id } } : undefined,
        },
        orderBy: { id: "asc" },
        take: INTERNAL_SCAN_PAGE_SIZE,
        ...(poolCursor ? { cursor: { id: poolCursor }, skip: 1 } : {}),
        include: {
          candidate: true,
          file: { select: { originalName: true } },
        },
      });

      for (const entry of poolEntries) {
        const structuredData = asRecord(entry.structuredData);
        const name = readText(structuredData, "fullName") ?? entry.candidate.fullName;
        const headline = readText(structuredData, "title") ?? entry.summary ?? undefined;
        const skills = readTextList(structuredData, "skills");
        const summary = readCvSummaryText(structuredData) ?? entry.summary ?? "";
        const evidence = joinEvidence([
          name,
          headline,
          skills.join(" "),
          entry.tags.join(" "),
          summary,
          entry.notes,
          entry.extractedText?.slice(0, 2500),
        ]);
        const potential = scoreInternalEvidence(evidence, job);
        if (potential.score < 45) continue;

        keepBetterSuggestion(byCandidateId, {
          candidateId: entry.candidateId,
          profileUrl: `/admin/talent-pool/${entry.id}`,
          normalizedProfileUrl: `internal://candidate/${entry.candidateId}`,
          displayName: name,
          headline,
          sourceKind: "talent_pool",
          sourceId: entry.id,
          potential,
        });
      }

      trimSuggestionBuffer(byCandidateId);
      if (poolEntries.length < INTERNAL_SCAN_PAGE_SIZE) break;
      poolCursor = poolEntries.at(-1)?.id;
      if (!poolCursor) break;
    }

    let candidateCursor: string | undefined;
    while (true) {
      const candidates = await prisma.candidate.findMany({
        where: job.id ? { applications: { none: { jobId: job.id } } } : undefined,
        orderBy: { id: "asc" },
        take: INTERNAL_SCAN_PAGE_SIZE,
        ...(candidateCursor ? { cursor: { id: candidateCursor }, skip: 1 } : {}),
        include: {
          applications: {
            orderBy: { createdAt: "desc" },
            take: 3,
            include: {
              job: { select: { title: true, locations: true, tags: true } },
              cvParseResult: { select: { summary: true, structuredData: true, extractedText: true } },
            },
          },
        },
      });

      for (const candidate of candidates) {
        const bestApplication = candidate.applications
          .map((application) => {
            const metadata = asRecord(application.cvParseResult?.structuredData);
            const evidence = joinEvidence([
              candidate.fullName,
              candidate.linkedinUrl,
              application.submittedPortfolioUrl,
              application.job.title,
              application.job.tags.join(" "),
              application.job.locations.join(" "),
              application.cvParseResult?.summary,
              readCvSummaryText(metadata),
              application.cvParseResult?.extractedText?.slice(0, 2500),
            ]);
            return { application, potential: scoreInternalEvidence(evidence, job) };
          })
          .filter(item => item.potential.score >= 45)
          .sort((left, right) => right.potential.score - left.potential.score)[0];
        if (!bestApplication) continue;

        keepBetterSuggestion(byCandidateId, {
          candidateId: candidate.id,
          profileUrl: `/admin/candidates/${candidate.id}?application=${bestApplication.application.id}`,
          normalizedProfileUrl: `internal://candidate/${candidate.id}`,
          displayName: candidate.fullName,
          headline: bestApplication.application.job.title,
          sourceKind: "previous_application",
          sourceId: bestApplication.application.id,
          potential: bestApplication.potential,
        });
      }

      trimSuggestionBuffer(byCandidateId);
      if (candidates.length < INTERNAL_SCAN_PAGE_SIZE) break;
      candidateCursor = candidates.at(-1)?.id;
      if (!candidateCursor) break;
    }

    return [...byCandidateId.values()]
      .sort((left, right) => right.potential.score - left.potential.score)
      .slice(0, MAX_INTERNAL_SUGGESTIONS);
  }

  private listProfiles(prisma: PrismaService, campaignId: string) {
    return prisma.sourcedProfile.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
    });
  }
}

function scoreInternalEvidence(evidence: string, job: SourcingJobInput): InternalPotentialScore {
  const normalizedEvidence = normalizeSourcingText(evidence);
  const titleSignals = buildTitleSignals(job.title);
  const skillSignals = job.tags.map((tag) => tag.trim()).filter(Boolean).slice(0, 10);
  const requirementSignals = extractRequirementSignals(job.requirements).slice(0, 8);
  const locationSignals = job.locations.map((location) => location.trim()).filter(Boolean);
  const senioritySignals = job.level ? [job.level] : [];
  const positiveSignals = [...titleSignals, ...skillSignals, ...requirementSignals, ...locationSignals, ...senioritySignals];
  const matchedSignals = unique(positiveSignals.filter((signal) => includesSourcingSignal(normalizedEvidence, signal))).slice(0, 10);
  const missingSignals = unique([...skillSignals, ...senioritySignals].filter((signal) => !includesSourcingSignal(normalizedEvidence, signal))).slice(0, 6);

  let score = 32;
  score += countMatches(normalizedEvidence, titleSignals) * 12;
  score += countMatches(normalizedEvidence, skillSignals) * 10;
  score += countMatches(normalizedEvidence, requirementSignals) * 5;
  score += countMatches(normalizedEvidence, locationSignals) * 7;
  score += countMatches(normalizedEvidence, senioritySignals) * 6;
  score -= missingSignals.length * 2;

  const boundedScore = Math.max(20, Math.min(96, score));
  const confidence = boundedScore >= 80 && matchedSignals.length >= 5 ? "HIGH" : boundedScore >= 62 ? "MEDIUM" : "LOW";

  return {
    score: boundedScore,
    confidence,
    matchedSignals,
    missingSignals,
    reason: confidence === "HIGH"
      ? "Hồ sơ nội bộ có nhiều tín hiệu khớp JD, nên ưu tiên TA review."
      : "Hồ sơ nội bộ có tín hiệu tiềm năng; cần mở hồ sơ/CV để xác minh trước khi liên hệ.",
  };
}

function buildInternalSuggestionNotes(suggestion: InternalSuggestion, job: SourcingJobInput) {
  return JSON.stringify({
    type: "internal_candidate_suggestion",
    scoringVersion: SOURCING_SCORING_VERSION,
    jdFingerprint: sourcingJobFingerprint(job),
    scoredAt: new Date().toISOString(),
    potentialScore: suggestion.potential.score,
    confidence: suggestion.potential.confidence,
    matchedSignals: suggestion.potential.matchedSignals,
    missingSignals: suggestion.potential.missingSignals,
    reason: suggestion.potential.reason,
    sourceKind: suggestion.sourceKind,
    sourceId: suggestion.sourceId,
    candidateId: suggestion.candidateId,
  });
}

function keepBetterSuggestion(suggestions: Map<string, InternalSuggestion>, suggestion: InternalSuggestion) {
  const current = suggestions.get(suggestion.candidateId);
  if (!current || suggestion.potential.score > current.potential.score) {
    suggestions.set(suggestion.candidateId, suggestion);
  }
}

function trimSuggestionBuffer(suggestions: Map<string, InternalSuggestion>) {
  if (suggestions.size <= INTERNAL_SHORTLIST_BUFFER) return;
  const retainedIds = new Set([...suggestions.values()]
    .sort((left, right) => right.potential.score - left.potential.score)
    .slice(0, INTERNAL_SHORTLIST_BUFFER)
    .map(suggestion => suggestion.candidateId));
  for (const candidateId of suggestions.keys()) {
    if (!retainedIds.has(candidateId)) suggestions.delete(candidateId);
  }
}

function sourcedProfileRefreshData(suggestion: InternalSuggestion, job: SourcingJobInput) {
  return {
    source: "TALENT_POOL" as const,
    profileUrl: suggestion.profileUrl,
    displayName: suggestion.displayName,
    headline: suggestion.headline,
    location: suggestion.location,
    notes: buildInternalSuggestionNotes(suggestion, job),
    extractionMethod: suggestion.sourceKind,
    fetchedAt: new Date(),
  };
}

function sourcedProfileCreateData(
  campaignId: string,
  suggestion: InternalSuggestion,
  job: SourcingJobInput,
): Prisma.SourcedProfileCreateManyInput {
  return {
    campaignId,
    normalizedProfileUrl: suggestion.normalizedProfileUrl,
    ...sourcedProfileRefreshData(suggestion, job),
  };
}

function buildTitleSignals(title: string) {
  const signals = [title.trim()];
  if (/tester|qa|quality/iu.test(title)) signals.push("QA", "Tester", "Quality Engineer", "Automation Tester", "SDET");
  if (/frontend|front-end/iu.test(title)) signals.push("Frontend", "React", "Vue", "Angular", "Web Developer");
  if (/backend|back-end/iu.test(title)) signals.push("Backend", "Node.js", "Java", "API", "Software Engineer");
  if (/full.?stack/iu.test(title)) signals.push("Full Stack", "Frontend", "Backend", "Software Engineer");
  if (/ai|machine learning|\bml\b/iu.test(title)) signals.push("AI", "Machine Learning", "LLM", "Python", "Data Scientist");
  if (/recruit|talent acquisition|\bta\b/iu.test(title)) signals.push("Recruiter", "Talent Acquisition", "Sourcing");
  return unique(signals);
}

function extractRequirementSignals(value: string) {
  return value
    .replace(/<[^>]*>/gu, " ")
    .split(/\n|[•●▪,;]/u)
    .map((line) => line.replace(/^[-–—*\d.)\s]+/u, "").trim())
    .filter((line) => line.length >= 3 && line.length <= 80);
}

function readCvSummaryText(record: Record<string, unknown> | null) {
  const cvSummary = asRecord(record?.cvSummary);
  if (!cvSummary) return undefined;
  return joinEvidence([
    readText(cvSummary, "overview"),
    readText(cvSummary, "currentTitle"),
    readText(cvSummary, "totalExperience"),
    readTextList(cvSummary, "keySkills").join(" "),
    readTextList(cvSummary, "workHighlights").join(" "),
  ]);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function readText(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readTextList(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && !!item.trim()) : [];
}

function joinEvidence(values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).filter(Boolean).join("\n");
}

function countMatches(evidence: string, signals: string[]) {
  return unique(signals).filter((signal) => includesSourcingSignal(evidence, signal)).length;
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
