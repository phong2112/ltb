import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { PrismaService } from "../../prisma";
import type { SourcingJobInput } from "../search";

const MAX_INTERNAL_SUGGESTIONS = 30;

type InternalSuggestion = {
  profileUrl: string;
  normalizedProfileUrl: string;
  displayName: string;
  headline?: string;
  location?: string;
  evidence: string;
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

    const created = await prisma.sourcedProfile.createMany({
      data: toCreate.map((suggestion) => ({
        campaignId,
        source: "TALENT_POOL",
        profileUrl: suggestion.profileUrl,
        normalizedProfileUrl: suggestion.normalizedProfileUrl,
        displayName: suggestion.displayName,
        headline: suggestion.headline,
        location: suggestion.location,
        notes: buildInternalSuggestionNotes(suggestion),
        extractionMethod: suggestion.sourceKind,
        fetchedAt: new Date(),
      } satisfies Prisma.SourcedProfileCreateManyInput)),
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
    const [poolEntries, candidates] = await Promise.all([
      prisma.talentPoolEntry.findMany({
        where: {
          promotedApplication: job.id ? { isNot: { jobId: job.id } } : undefined,
        },
        orderBy: { updatedAt: "desc" },
        take: 80,
        include: {
          candidate: true,
          file: { select: { originalName: true } },
        },
      }),
      prisma.candidate.findMany({
        where: job.id
          ? {
              applications: {
                none: { jobId: job.id },
              },
            }
          : undefined,
        orderBy: { updatedAt: "desc" },
        take: 80,
        include: {
          applications: {
            orderBy: { createdAt: "desc" },
            take: 3,
            include: {
              job: { select: { title: true, locations: true, tags: true } },
              cvParseResult: { select: { summary: true, structuredData: true, extractedText: true } },
              matchResult: { select: { score: true, strengths: true, risks: true } },
            },
          },
        },
      }),
    ]);

    const byInternalKey = new Map<string, InternalSuggestion>();

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

      byInternalKey.set(`talent-pool:${entry.id}`, {
        profileUrl: `/admin/talent-pool/${entry.id}`,
        normalizedProfileUrl: `internal://talent-pool/${entry.id}`,
        displayName: name,
        headline,
        evidence: evidence.slice(0, 1500),
        sourceKind: "talent_pool",
        sourceId: entry.id,
        potential,
      });
    }

    for (const candidate of candidates) {
      const application = candidate.applications[0];
      if (!application) continue;

      const metadata = asRecord(application.cvParseResult?.structuredData);
      const cvSummary = readCvSummaryText(metadata);
      const strengths = readJsonStringList(application.matchResult?.strengths);
      const evidence = joinEvidence([
        candidate.fullName,
        candidate.linkedinUrl,
        application.submittedPortfolioUrl,
        application.job.title,
        application.job.tags.join(" "),
        application.job.locations.join(" "),
        application.cvParseResult?.summary,
        cvSummary,
        strengths.join(" "),
        application.cvParseResult?.extractedText?.slice(0, 2500),
      ]);
      const potential = scoreInternalEvidence(evidence, job, application.matchResult?.score ?? undefined);
      if (potential.score < 45) continue;

      byInternalKey.set(`candidate:${candidate.id}`, {
        profileUrl: `/admin/candidates/${candidate.id}?application=${application.id}`,
        normalizedProfileUrl: `internal://candidate/${candidate.id}`,
        displayName: candidate.fullName,
        headline: application.job.title,
        evidence: evidence.slice(0, 1500),
        sourceKind: "previous_application",
        sourceId: application.id,
        potential,
      });
    }

    return [...byInternalKey.values()]
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

function scoreInternalEvidence(evidence: string, job: SourcingJobInput, previousScore?: number): InternalPotentialScore {
  const normalizedEvidence = evidence.toLowerCase();
  const titleSignals = buildTitleSignals(job.title);
  const skillSignals = job.tags.map((tag) => tag.trim()).filter(Boolean).slice(0, 10);
  const requirementSignals = extractRequirementSignals(job.requirements).slice(0, 8);
  const locationSignals = job.locations.map((location) => location.trim()).filter(Boolean);
  const senioritySignals = job.level ? [job.level] : [];
  const positiveSignals = [...titleSignals, ...skillSignals, ...requirementSignals, ...locationSignals, ...senioritySignals];
  const matchedSignals = unique(positiveSignals.filter((signal) => includesSignal(normalizedEvidence, signal))).slice(0, 10);
  const missingSignals = unique([...skillSignals, ...senioritySignals].filter((signal) => !includesSignal(normalizedEvidence, signal))).slice(0, 6);

  let score = previousScore ? Math.round(previousScore * 0.55) : 32;
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

function buildInternalSuggestionNotes(suggestion: InternalSuggestion) {
  return JSON.stringify({
    type: "internal_candidate_suggestion",
    potentialScore: suggestion.potential.score,
    confidence: suggestion.potential.confidence,
    matchedSignals: suggestion.potential.matchedSignals,
    missingSignals: suggestion.potential.missingSignals,
    reason: suggestion.potential.reason,
    sourceKind: suggestion.sourceKind,
    sourceId: suggestion.sourceId,
    evidence: suggestion.evidence,
  });
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

function readJsonStringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && !!item.trim()) : [];
}

function joinEvidence(values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).filter(Boolean).join("\n");
}

function countMatches(evidence: string, signals: string[]) {
  return unique(signals).filter((signal) => includesSignal(evidence, signal)).length;
}

function includesSignal(evidence: string, signal: string) {
  const normalized = signal.trim().toLowerCase();
  return normalized.length > 1 && evidence.includes(normalized);
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
