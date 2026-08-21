import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import type { PrismaService } from "../../prisma";
import {
  buildLinkedinDiscoveryQueries,
  type SourcingDiscoveryLocationScope,
  type SourcingDiscoveryEnhancements,
  type SourcingJobInput,
  type SourcingSearchQuery,
} from "../search";
import { BraveLinkedinDiscoveryAdapter, BraveSearchError } from "./brave-linkedin.adapter";
import { scoreLinkedinDiscoveryResult } from "./scoring";
import type {
  LinkedinDiscoveryAdapter,
  LinkedinDiscoveryFailure,
  LinkedinDiscoveryResult,
  LinkedinDiscoverySummary,
} from "./types";

const DEFAULT_MAX_QUERIES = 12;
const DEFAULT_RESULTS_PER_QUERY = 10;

@Injectable()
export class LinkedinDiscoveryService {
  private readonly logger = new Logger(LinkedinDiscoveryService.name);
  private adapter?: LinkedinDiscoveryAdapter;

  constructor(private readonly configService: ConfigService) {}

  isEnabled() {
    return this.configService.get<string>("SOURCING_DISCOVERY_ENABLED") === "true";
  }

  createAdapter(): LinkedinDiscoveryAdapter {
    const apiKey = this.configService.get<string>("BRAVE_SEARCH_API_KEY")?.trim();
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException("LinkedIn discovery chưa được bật. Hãy cấu hình SOURCING_DISCOVERY_ENABLED=true.");
    }
    if (!apiKey) {
      throw new ServiceUnavailableException("Thiếu BRAVE_SEARCH_API_KEY để chạy LinkedIn discovery.");
    }
    this.adapter ??= new BraveLinkedinDiscoveryAdapter(apiKey, {
      timeoutMs: this.positiveInteger("SOURCING_DISCOVERY_TIMEOUT_MS", 10_000),
      maxAttempts: this.positiveInteger("SOURCING_DISCOVERY_MAX_ATTEMPTS", 3),
      minRequestIntervalMs: this.nonNegativeInteger("SOURCING_DISCOVERY_MIN_INTERVAL_MS", 1_100),
    });
    return this.adapter;
  }

  async discoverAndStore(
    prisma: PrismaService,
    campaignId: string,
    job: SourcingJobInput,
    options: {
      locationScope?: SourcingDiscoveryLocationScope;
      enhancements?: SourcingDiscoveryEnhancements;
    } = {},
  ): Promise<LinkedinDiscoverySummary & { profiles: unknown[] }> {
    const maxQueries = this.positiveInteger("SOURCING_DISCOVERY_MAX_QUERIES_PER_CAMPAIGN", DEFAULT_MAX_QUERIES);
    const resultsPerQuery = this.positiveInteger("SOURCING_DISCOVERY_RESULTS_PER_QUERY", DEFAULT_RESULTS_PER_QUERY);
    const queries = buildLinkedinDiscoveryQueries(job, options).slice(0, maxQueries);

    if (!queries.length) {
      throw new BadRequestException("Không tạo được LinkedIn discovery query từ JD này.");
    }

    let adapter: LinkedinDiscoveryAdapter;
    try {
      adapter = this.createAdapter();
    } catch (error) {
      const failure = providerConfigurationFailure(error);
      return {
        provider: "brave",
        providerStatus: "UNAVAILABLE",
        createdCount: 0,
        duplicateCount: 0,
        queryCount: queries.length,
        successfulQueryCount: 0,
        resultCount: 0,
        skippedQueries: queries.map((query) => query.id),
        failures: [failure],
        profiles: await this.listProfiles(prisma, campaignId),
      };
    }

    const discovered: LinkedinDiscoveryResult[] = [];
    const skippedQueries: string[] = [];
    const failures: LinkedinDiscoveryFailure[] = [];
    let successfulQueryCount = 0;

    for (let queryIndex = 0; queryIndex < queries.length; queryIndex += 1) {
      const query = queries[queryIndex];
      try {
        discovered.push(...await adapter.discover(query, resultsPerQuery));
        successfulQueryCount += 1;
      } catch (error) {
        skippedQueries.push(query.id);
        const failure = discoveryFailure(query.id, error);
        failures.push(failure);
        this.logger.warn(
          `LinkedIn discovery query failed: queryId=${query.id} code=${failure.code} attempts=${failure.attempts}`,
        );

        if (failure.code === "AUTHENTICATION" || failure.code === "RATE_LIMIT") {
          const remainingQueries = queries.slice(queryIndex + 1);
          skippedQueries.push(...remainingQueries.map((item) => item.id));
          break;
        }
      }
    }

    const byUrl = selectBestDiscoveryResults(discovered, queries);
    const normalizedUrls = [...byUrl.keys()];

    if (!normalizedUrls.length) {
      return {
        provider: "brave",
        providerStatus: failures.length
          ? successfulQueryCount > 0 ? "DEGRADED" : "UNAVAILABLE"
          : "COMPLETED",
        createdCount: 0,
        duplicateCount: 0,
        queryCount: queries.length,
        successfulQueryCount,
        resultCount: 0,
        skippedQueries,
        failures,
        profiles: await this.listProfiles(prisma, campaignId),
      };
    }

    const existing = await prisma.sourcedProfile.findMany({
      where: { campaignId, normalizedProfileUrl: { in: normalizedUrls } },
      select: { normalizedProfileUrl: true },
    });
    const existingSet = new Set(existing.map((item) => item.normalizedProfileUrl));
    const toCreate = [...byUrl.values()].filter((result) => !existingSet.has(result.normalizedProfileUrl));

    const created = await prisma.sourcedProfile.createMany({
      data: toCreate.map((result) => {
        const potential = scoreLinkedinDiscoveryResult(result, job);
        return {
          campaignId,
          source: "LINKEDIN",
          profileUrl: result.profileUrl,
          normalizedProfileUrl: result.normalizedProfileUrl,
          displayName: result.displayName,
          headline: result.headline,
          notes: buildDiscoveryNotes(result, potential),
          extractionMethod: "search_api_snippet",
          fetchedAt: result.fetchedAt,
        } satisfies Prisma.SourcedProfileCreateManyInput;
      }),
      skipDuplicates: true,
    });

    return {
      provider: "brave",
      providerStatus: failures.length ? "DEGRADED" : "COMPLETED",
      createdCount: created.count,
      duplicateCount: normalizedUrls.length - created.count,
      queryCount: queries.length,
      successfulQueryCount,
      resultCount: normalizedUrls.length,
      skippedQueries,
      failures,
      profiles: await this.listProfiles(prisma, campaignId),
    };
  }

  private listProfiles(prisma: PrismaService, campaignId: string) {
    return prisma.sourcedProfile.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
    });
  }

  private positiveInteger(key: string, fallback: number) {
    const value = this.configService.get<number | string>(key);
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private nonNegativeInteger(key: string, fallback: number) {
    const value = this.configService.get<number | string>(key);
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
  }
}

function selectBestDiscoveryResults(
  discovered: LinkedinDiscoveryResult[],
  queries: SourcingSearchQuery[],
) {
  const queryPriorities = new Map(queries.map((query) => [query.id, query.priority]));
  const byUrl = new Map<string, LinkedinDiscoveryResult>();

  for (const result of discovered) {
    const current = byUrl.get(result.normalizedProfileUrl);
    if (!current || isBetterResult(result, current, queryPriorities)) {
      byUrl.set(result.normalizedProfileUrl, result);
    }
  }
  return byUrl;
}

function isBetterResult(
  candidate: LinkedinDiscoveryResult,
  current: LinkedinDiscoveryResult,
  priorities: Map<string, number>,
) {
  const candidatePriority = priorities.get(candidate.queryId) ?? Number.MAX_SAFE_INTEGER;
  const currentPriority = priorities.get(current.queryId) ?? Number.MAX_SAFE_INTEGER;
  if (candidatePriority !== currentPriority) return candidatePriority < currentPriority;
  if (candidate.searchRank !== current.searchRank) return candidate.searchRank < current.searchRank;
  return candidate.snippet.length > current.snippet.length;
}

function discoveryFailure(queryId: string, error: unknown): LinkedinDiscoveryFailure {
  if (error instanceof BraveSearchError) {
    return {
      queryId,
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      attempts: error.attempts,
      ...(error.status === undefined ? {} : { status: error.status }),
    };
  }
  return {
    queryId,
    code: "UNKNOWN",
    message: "Unexpected search provider error.",
    retryable: false,
    attempts: 1,
  };
}

function providerConfigurationFailure(error: unknown): LinkedinDiscoveryFailure {
  const disabled = error instanceof ServiceUnavailableException && error.message.includes("chưa được bật");
  return {
    queryId: "provider",
    code: disabled ? "DISABLED" : "CONFIGURATION",
    message: error instanceof ServiceUnavailableException
      ? error.message
      : "Brave Search discovery is not configured.",
    retryable: false,
    attempts: 0,
  };
}

function buildDiscoveryNotes(
  result: LinkedinDiscoveryResult,
  potential: ReturnType<typeof scoreLinkedinDiscoveryResult>,
) {
  return JSON.stringify({
    type: "linkedin_discovery",
    potentialScore: potential.score,
    confidence: potential.confidence,
    matchedSignals: potential.matchedSignals,
    missingSignals: potential.missingSignals,
    reason: potential.reason,
    sourceQueryId: result.queryId,
    sourceQuery: result.query,
    searchRank: result.searchRank,
    evidence: result.snippet,
  });
}
