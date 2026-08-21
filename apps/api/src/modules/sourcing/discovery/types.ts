import type { SourcingSearchQuery } from "../search";
import type { BraveSearchFailureCode } from "./brave-linkedin.adapter";

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
  provider: "brave";
  providerStatus: "COMPLETED" | "DEGRADED" | "UNAVAILABLE";
  createdCount: number;
  duplicateCount: number;
  queryCount: number;
  successfulQueryCount: number;
  resultCount: number;
  skippedQueries: string[];
  failures: LinkedinDiscoveryFailure[];
};

export type LinkedinDiscoveryFailure = {
  queryId: string;
  code: BraveSearchFailureCode | "DISABLED" | "CONFIGURATION" | "UNKNOWN";
  message: string;
  retryable: boolean;
  attempts: number;
  status?: number;
};
