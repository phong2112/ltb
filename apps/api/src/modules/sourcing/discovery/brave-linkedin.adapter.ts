import type { SourcingSearchQuery } from "@/modules/sourcing/search";
import { normalizeLinkedinProfileUrl } from "@/modules/sourcing/search";
import type { LinkedinDiscoveryAdapter, LinkedinDiscoveryResult } from "./types";

const BRAVE_WEB_SEARCH_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";
const BRAVE_MAX_QUERY_CHARACTERS = 400;
const BRAVE_MAX_QUERY_WORDS = 50;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_MIN_REQUEST_INTERVAL_MS = 1_100;
const MAX_RETRY_DELAY_MS = 5_000;

export type BraveSearchFailureCode =
  | "AUTHENTICATION"
  | "INVALID_REQUEST"
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "UPSTREAM"
  | "NETWORK"
  | "INVALID_RESPONSE";

export class BraveSearchError extends Error {
  constructor(
    message: string,
    readonly code: BraveSearchFailureCode,
    readonly retryable: boolean,
    readonly attempts: number,
    readonly status?: number,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "BraveSearchError";
  }
}

type BraveLinkedinDiscoveryAdapterOptions = {
  timeoutMs?: number;
  maxAttempts?: number;
  minRequestIntervalMs?: number;
  fetch?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
};

export class BraveLinkedinDiscoveryAdapter implements LinkedinDiscoveryAdapter {
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly minRequestIntervalMs: number;
  private readonly fetch: typeof fetch;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly now: () => number;
  private nextRequestAt = 0;
  private requestQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly apiKey: string,
    options: BraveLinkedinDiscoveryAdapterOptions = {},
  ) {
    this.timeoutMs = positiveInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS);
    this.maxAttempts = positiveInteger(options.maxAttempts, DEFAULT_MAX_ATTEMPTS);
    this.minRequestIntervalMs = nonNegativeInteger(
      options.minRequestIntervalMs,
      DEFAULT_MIN_REQUEST_INTERVAL_MS,
    );
    this.fetch = options.fetch ?? globalThis.fetch;
    this.sleep = options.sleep ?? delay;
    this.now = options.now ?? Date.now;
  }

  discover(query: SourcingSearchQuery, limit: number): Promise<LinkedinDiscoveryResult[]> {
    return this.enqueue(() => this.executeDiscovery(query, limit));
  }

  private enqueue<T>(operation: () => Promise<T>) {
    const scheduled = this.requestQueue.then(operation, operation);
    this.requestQueue = scheduled.then(() => undefined, () => undefined);
    return scheduled;
  }

  private async executeDiscovery(query: SourcingSearchQuery, limit: number) {
    const requestUrl = buildRequestUrl(query.query, limit);
    let lastError: BraveSearchError | undefined;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      await this.waitForRequestSlot();

      let response: Response;
      try {
        response = await this.fetch(requestUrl, {
          headers: {
            Accept: "application/json",
            "X-Subscription-Token": this.apiKey,
          },
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch (error) {
        lastError = networkError(error, attempt);
        this.reserveNextRequestSlot();
        if (!lastError.retryable || attempt === this.maxAttempts) throw lastError;
        await this.sleep(retryDelayMs(attempt));
        continue;
      }

      const retryAfterMs = readRetryAfterMs(response.headers, this.now());
      this.reserveNextRequestSlot(retryAfterMs);

      if (!response.ok) {
        lastError = responseError(response.status, attempt, retryAfterMs);
        if (!lastError.retryable || attempt === this.maxAttempts) throw lastError;
        await this.sleep(retryAfterMs || retryDelayMs(attempt));
        continue;
      }

      let payload: unknown;
      try {
        payload = await response.json() as unknown;
      } catch {
        throw new BraveSearchError(
          "Brave Search returned an invalid JSON response.",
          "INVALID_RESPONSE",
          false,
          attempt,
          response.status,
        );
      }

      return mapDiscoveryResults(payload, query);
    }

    throw lastError ?? new BraveSearchError(
      "Brave Search request failed.",
      "UPSTREAM",
      true,
      this.maxAttempts,
    );
  }

  private async waitForRequestSlot() {
    const waitMs = this.nextRequestAt - this.now();
    if (waitMs > 0) await this.sleep(waitMs);
  }

  private reserveNextRequestSlot(providerRetryAfterMs = 0) {
    const waitMs = Math.max(this.minRequestIntervalMs, providerRetryAfterMs);
    this.nextRequestAt = Math.max(this.nextRequestAt, this.now() + waitMs);
  }
}

type BraveWebResult = {
  title: string;
  url: string;
  description: string;
  extraSnippets: string[];
};

function buildRequestUrl(rawQuery: string, limit: number) {
  const requestUrl = new URL(BRAVE_WEB_SEARCH_ENDPOINT);
  requestUrl.searchParams.set("q", compactBraveQuery(rawQuery));
  requestUrl.searchParams.set("count", String(Math.min(Math.max(limit, 1), 20)));
  requestUrl.searchParams.set("country", "ALL");
  requestUrl.searchParams.set("search_lang", "en");
  requestUrl.searchParams.set("ui_lang", "en-US");
  requestUrl.searchParams.set("result_filter", "web");
  requestUrl.searchParams.set("extra_snippets", "true");
  requestUrl.searchParams.set("text_decorations", "false");
  requestUrl.searchParams.set("safesearch", "moderate");
  return requestUrl;
}

export function compactBraveQuery(value: string) {
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (!normalized) {
    throw new BraveSearchError("Brave Search query is empty.", "INVALID_REQUEST", false, 0);
  }

  const tokens = tokenizeQuery(normalized);
  const selected: string[] = [];
  let wordCount = 0;

  for (const token of tokens) {
    const tokenWordCount = token.split(/\s+/u).filter(Boolean).length;
    const candidate = [...selected, token].join(" ");
    if (wordCount + tokenWordCount > BRAVE_MAX_QUERY_WORDS || candidate.length > BRAVE_MAX_QUERY_CHARACTERS) break;
    selected.push(token);
    wordCount += tokenWordCount;
  }

  trimTrailingBooleanOperators(selected);
  let compacted = closeOpenParentheses(selected.join(" "));
  while (compacted.length > BRAVE_MAX_QUERY_CHARACTERS && selected.length > 1) {
    selected.pop();
    trimTrailingBooleanOperators(selected);
    compacted = closeOpenParentheses(selected.join(" "));
  }
  if (!compacted) {
    throw new BraveSearchError("Brave Search query exceeds provider limits.", "INVALID_REQUEST", false, 0);
  }
  return compacted;
}

function trimTrailingBooleanOperators(tokens: string[]) {
  while (["AND", "OR"].includes(tokens.at(-1)?.toUpperCase() ?? "")) tokens.pop();
}

function closeOpenParentheses(value: string) {
  let balance = 0;
  let quoted = false;
  for (const character of value) {
    if (character === '"') {
      quoted = !quoted;
    } else if (!quoted && character === "(") {
      balance += 1;
    } else if (!quoted && character === ")" && balance > 0) {
      balance -= 1;
    }
  }
  return `${value}${")".repeat(balance)}`;
}

function tokenizeQuery(value: string) {
  const tokens: string[] = [];
  let token = "";
  let quoted = false;

  for (const character of value) {
    if (/\s/u.test(character) && !quoted) {
      if (token) tokens.push(token);
      token = "";
      continue;
    }
    token += character;
    if (character === '"') quoted = !quoted;
  }
  if (token) tokens.push(token);
  return tokens;
}

function mapDiscoveryResults(payload: unknown, query: SourcingSearchQuery) {
  const results = readWebResults(payload);
  const fetchedAt = new Date();
  const uniqueResults = new Map<string, LinkedinDiscoveryResult>();

  results.forEach((item, index) => {
    const normalizedProfileUrl = normalizeLinkedinProfileUrl(item.url);
    if (!normalizedProfileUrl || uniqueResults.has(normalizedProfileUrl)) return;

    const parsedTitle = parseLinkedinTitle(item.title);
    uniqueResults.set(normalizedProfileUrl, {
      source: "LINKEDIN",
      profileUrl: normalizedProfileUrl,
      normalizedProfileUrl,
      displayName: parsedTitle.displayName,
      headline: parsedTitle.headline,
      snippet: [item.description, ...item.extraSnippets].filter(Boolean).join("\n").slice(0, 1500),
      queryId: query.id,
      query: query.query,
      searchRank: index + 1,
      fetchedAt,
    });
  });

  return [...uniqueResults.values()];
}

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

function parseLinkedinTitle(title: string) {
  const cleaned = stripLinkedinSuffix(title);
  const separator = cleaned.match(/\s(?:-|\||–|—)\s/u);
  if (separator?.index === undefined) return { displayName: cleaned || undefined, headline: undefined };

  const displayName = cleaned.slice(0, separator.index).trim() || undefined;
  const headline = cleaned.slice(separator.index + separator[0].length).trim() || undefined;
  return { displayName, headline };
}

function stripLinkedinSuffix(title: string) {
  return title
    .replace(/\s*\|\s*LinkedIn\s*$/iu, "")
    .replace(/\s*-\s*LinkedIn\s*$/iu, "")
    .trim();
}

function networkError(error: unknown, attempt: number) {
  if (isAbortError(error)) {
    return new BraveSearchError(
      "Brave Search request timed out.",
      "TIMEOUT",
      true,
      attempt,
    );
  }
  return new BraveSearchError(
    "Could not connect to Brave Search.",
    "NETWORK",
    true,
    attempt,
  );
}

function responseError(status: number, attempt: number, retryAfterMs?: number) {
  if (status === 401 || status === 403) {
    return new BraveSearchError(
      "Brave Search credentials were rejected.",
      "AUTHENTICATION",
      false,
      attempt,
      status,
    );
  }
  if (status === 429) {
    return new BraveSearchError(
      "Brave Search rate limit was reached.",
      "RATE_LIMIT",
      true,
      attempt,
      status,
      retryAfterMs,
    );
  }
  if (status === 408 || status === 425 || status >= 500) {
    return new BraveSearchError(
      `Brave Search is temporarily unavailable (status ${status}).`,
      "UPSTREAM",
      true,
      attempt,
      status,
      retryAfterMs,
    );
  }
  return new BraveSearchError(
    `Brave Search rejected the request (status ${status}).`,
    "INVALID_REQUEST",
    false,
    attempt,
    status,
  );
}

function readRetryAfterMs(headers: Headers, now: number) {
  const retryAfter = headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;

    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.max(0, date - now);
  }

  const remaining = firstHeaderNumber(headers.get("x-ratelimit-remaining"));
  const resetSeconds = firstHeaderNumber(headers.get("x-ratelimit-reset"));
  if (remaining === 0 && resetSeconds !== undefined) return Math.max(0, resetSeconds * 1000);
  return 0;
}

function firstHeaderNumber(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value.split(",", 1)[0]?.trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function retryDelayMs(attempt: number) {
  return Math.min(250 * (2 ** (attempt - 1)), MAX_RETRY_DELAY_MS);
}

function isAbortError(error: unknown) {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function positiveInteger(value: number | undefined, fallback: number) {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}

function nonNegativeInteger(value: number | undefined, fallback: number) {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
