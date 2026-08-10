import { BadGatewayException } from "@nestjs/common";
import type { SourcingSearchQuery } from "../search";
import { normalizeLinkedinProfileUrl } from "../search";
import type { LinkedinDiscoveryAdapter, LinkedinDiscoveryResult } from "./types";

const BRAVE_WEB_SEARCH_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";

export class BraveLinkedinDiscoveryAdapter implements LinkedinDiscoveryAdapter {
  constructor(private readonly apiKey: string) {}

  async discover(query: SourcingSearchQuery, limit: number): Promise<LinkedinDiscoveryResult[]> {
    const requestUrl = new URL(BRAVE_WEB_SEARCH_ENDPOINT);
    requestUrl.searchParams.set("q", query.query);
    requestUrl.searchParams.set("count", String(Math.min(Math.max(limit, 1), 20)));
    requestUrl.searchParams.set("country", "VN");
    requestUrl.searchParams.set("search_lang", "en");
    requestUrl.searchParams.set("extra_snippets", "true");
    requestUrl.searchParams.set("safesearch", "moderate");

    const response = await fetch(requestUrl, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": this.apiKey,
      },
    });

    if (!response.ok) {
      throw new BadGatewayException(`Brave Search discovery failed with status ${response.status}.`);
    }

    const payload = await response.json() as unknown;
    const results = readWebResults(payload);
    const fetchedAt = new Date();
    const uniqueResults = new Map<string, LinkedinDiscoveryResult>();

    results.forEach((item, index) => {
      const normalizedProfileUrl = normalizeLinkedinProfileUrl(item.url);
      if (!normalizedProfileUrl || uniqueResults.has(normalizedProfileUrl)) return;

      uniqueResults.set(normalizedProfileUrl, {
        source: "LINKEDIN",
        profileUrl: normalizedProfileUrl,
        normalizedProfileUrl,
        displayName: parseDisplayName(item.title),
        headline: stripLinkedinSuffix(item.title),
        snippet: [item.description, ...item.extraSnippets].filter(Boolean).join("\n").slice(0, 1500),
        queryId: query.id,
        query: query.query,
        searchRank: index + 1,
        fetchedAt,
      });
    });

    return [...uniqueResults.values()];
  }
}

type BraveWebResult = {
  title: string;
  url: string;
  description: string;
  extraSnippets: string[];
};

function readWebResults(payload: unknown): BraveWebResult[] {
  if (!isRecord(payload) || !isRecord(payload.web) || !Array.isArray(payload.web.results)) return [];

  return payload.web.results.flatMap((item): BraveWebResult[] => {
    if (!isRecord(item) || typeof item.url !== "string") return [];
    const title = typeof item.title === "string" ? item.title : "";
    const description = typeof item.description === "string" ? item.description : "";
    const extraSnippets = Array.isArray(item.extra_snippets)
      ? item.extra_snippets.filter((snippet): snippet is string => typeof snippet === "string")
      : [];

    return [{ title, url: item.url, description, extraSnippets }];
  });
}

function parseDisplayName(title: string) {
  const cleaned = stripLinkedinSuffix(title).split("|")[0]?.split("-")[0]?.trim();
  return cleaned || undefined;
}

function stripLinkedinSuffix(title: string) {
  return title
    .replace(/\s*\|\s*LinkedIn\s*$/iu, "")
    .replace(/\s*-\s*LinkedIn\s*$/iu, "")
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
