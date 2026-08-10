import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import type { PrismaService } from "../../prisma";
import { buildLinkedinDiscoveryQueries, type SourcingJobInput } from "../search";
import { BraveLinkedinDiscoveryAdapter } from "./brave-linkedin.adapter";
import { scoreLinkedinDiscoveryResult } from "./scoring";
import type { LinkedinDiscoveryAdapter, LinkedinDiscoveryResult, LinkedinDiscoverySummary } from "./types";

const DEFAULT_MAX_QUERIES = 12;
const DEFAULT_RESULTS_PER_QUERY = 10;

@Injectable()
export class LinkedinDiscoveryService {
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
    return new BraveLinkedinDiscoveryAdapter(apiKey);
  }

  async discoverAndStore(
    prisma: PrismaService,
    campaignId: string,
    job: SourcingJobInput,
  ): Promise<LinkedinDiscoverySummary & { profiles: unknown[] }> {
    const adapter = this.createAdapter();
    const maxQueries = this.positiveInteger("SOURCING_DISCOVERY_MAX_QUERIES_PER_CAMPAIGN", DEFAULT_MAX_QUERIES);
    const resultsPerQuery = this.positiveInteger("SOURCING_DISCOVERY_RESULTS_PER_QUERY", DEFAULT_RESULTS_PER_QUERY);
    const queries = buildLinkedinDiscoveryQueries(job).slice(0, maxQueries);

    if (!queries.length) {
      throw new BadRequestException("Không tạo được LinkedIn discovery query từ JD này.");
    }

    const discovered: LinkedinDiscoveryResult[] = [];
    const skippedQueries: string[] = [];

    for (const query of queries) {
      try {
        discovered.push(...await adapter.discover(query, resultsPerQuery));
      } catch {
        skippedQueries.push(query.id);
      }
    }

    const byUrl = new Map(discovered.map((result) => [result.normalizedProfileUrl, result]));
    const normalizedUrls = [...byUrl.keys()];

    if (!normalizedUrls.length) {
      return {
        createdCount: 0,
        duplicateCount: 0,
        queryCount: queries.length,
        resultCount: 0,
        skippedQueries,
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
      createdCount: created.count,
      duplicateCount: normalizedUrls.length - created.count,
      queryCount: queries.length,
      resultCount: normalizedUrls.length,
      skippedQueries,
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
