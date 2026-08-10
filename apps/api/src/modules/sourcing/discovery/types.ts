import type { SourcingSearchQuery } from "../search";

export type LinkedinDiscoveryResult = {
  source: "LINKEDIN";
  profileUrl: string;
  normalizedProfileUrl: string;
  displayName?: string;
  headline?: string;
  snippet: string;
  queryId: string;
  query: string;
  searchRank: number;
  fetchedAt: Date;
};

export type LinkedinDiscoveryAdapter = {
  discover(query: SourcingSearchQuery, limit: number): Promise<LinkedinDiscoveryResult[]>;
};

export type LinkedinPotentialScore = {
  score: number;
  confidence: "LOW" | "MEDIUM";
  matchedSignals: string[];
  missingSignals: string[];
  reason: string;
};

export type LinkedinDiscoverySummary = {
  createdCount: number;
  duplicateCount: number;
  queryCount: number;
  resultCount: number;
  skippedQueries: string[];
};
