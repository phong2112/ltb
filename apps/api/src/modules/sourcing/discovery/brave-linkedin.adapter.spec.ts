import {
  BraveLinkedinDiscoveryAdapter,
  BraveSearchError,
  compactBraveQuery,
} from "./brave-linkedin.adapter";

describe("BraveLinkedinDiscoveryAdapter", () => {
  it("maps Brave web results to normalized LinkedIn discovery results", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({
      web: {
        results: [
          {
            title: "Nguyen Van A - Senior QA Engineer | LinkedIn",
            url: "https://www.linkedin.com/in/nguyen-van-a/?trk=public_profile",
            description: "Senior QA Engineer in Ho Chi Minh with Playwright and API testing.",
            extra_snippets: ["Automation testing, Selenium, Vietnam"],
          },
          {
            title: "Company Page | LinkedIn",
            url: "https://www.linkedin.com/company/example",
            description: "Not a people profile.",
          },
        ],
      },
    }));
    const adapter = createAdapter(fetchMock);

    await expect(adapter.discover(query(), 10)).resolves.toEqual([expect.objectContaining({
      displayName: "Nguyen Van A",
      headline: "Senior QA Engineer",
      normalizedProfileUrl: "https://www.linkedin.com/in/nguyen-van-a",
      queryId: "q1",
      searchRank: 1,
      snippet: expect.stringContaining("Playwright"),
    })]);

    expect(fetchMock).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({
      headers: expect.objectContaining({
        "X-Loc-Country": "VN",
        "X-Subscription-Token": "token",
      }),
      signal: expect.any(AbortSignal),
    }));
    const requestUrl = fetchMock.mock.calls[0][0] as URL;
    expect(requestUrl.searchParams.get("country")).toBe("ALL");
    expect(requestUrl.searchParams.get("ui_lang")).toBe("en-US");
    expect(requestUrl.searchParams.get("result_filter")).toBe("web");
    expect(requestUrl.searchParams.get("text_decorations")).toBe("false");
  });

  it("uses global provider targeting only for global campaigns", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({ web: { results: [] } }));
    const adapter = createAdapter(fetchMock);

    await adapter.discover(query(), 10, "GLOBAL");

    const requestUrl = fetchMock.mock.calls[0][0] as URL;
    expect(requestUrl.searchParams.get("country")).toBe("ALL");
    expect(requestUrl.searchParams.get("ui_lang")).toBe("en-US");
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(request.headers).not.toHaveProperty("X-Loc-Country");
  });

  it("retries a rate-limited request using the provider reset header", async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(jsonResponse({}, 429, {
        "x-ratelimit-remaining": "0, 1000",
        "x-ratelimit-reset": "1, 10000",
      }))
      .mockResolvedValueOnce(jsonResponse({ web: { results: [] } }));
    const sleep = jest.fn().mockResolvedValue(undefined);
    const adapter = new BraveLinkedinDiscoveryAdapter("token", {
      fetch: fetchMock as typeof fetch,
      maxAttempts: 2,
      minRequestIntervalMs: 0,
      sleep,
      now: () => 0,
    });

    await expect(adapter.discover(query(), 10)).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1_000);
  });

  it("honors a Retry-After value longer than the local backoff cap", async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(jsonResponse({}, 429, { "retry-after": "60" }))
      .mockResolvedValueOnce(jsonResponse({ web: { results: [] } }));
    const sleep = jest.fn().mockResolvedValue(undefined);
    const adapter = new BraveLinkedinDiscoveryAdapter("token", {
      fetch: fetchMock as typeof fetch,
      maxAttempts: 2,
      minRequestIntervalMs: 0,
      sleep,
      now: () => 0,
    });

    await expect(adapter.discover(query(), 10)).resolves.toEqual([]);

    expect(sleep).toHaveBeenCalledWith(60_000);
  });

  it("does not retry rejected credentials", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({}, 401));
    const adapter = createAdapter(fetchMock, 3);

    await expect(adapter.discover(query(), 10)).rejects.toMatchObject({
      name: "BraveSearchError",
      code: "AUTHENTICATION",
      retryable: false,
      attempts: 1,
      status: 401,
    } satisfies Partial<BraveSearchError>);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports a safe timeout error after bounded attempts", async () => {
    const timeout = Object.assign(new Error("request timed out with secret URL"), { name: "TimeoutError" });
    const fetchMock = jest.fn().mockRejectedValue(timeout);
    const adapter = createAdapter(fetchMock, 2);

    await expect(adapter.discover(query(), 10)).rejects.toMatchObject({
      code: "TIMEOUT",
      attempts: 2,
      message: "Brave Search request timed out.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("compacts generated queries to Brave's documented limits without breaking quoted phrases", () => {
    const longQuery = `site:linkedin.com/in (${Array.from({ length: 70 }, (_, index) => `"skill ${index}"`).join(" OR ")})`;
    const compacted = compactBraveQuery(longQuery);

    expect(compacted.length).toBeLessThanOrEqual(400);
    expect(compacted.split(/\s+/u).length).toBeLessThanOrEqual(50);
    expect((compacted.match(/"/gu) ?? []).length % 2).toBe(0);
    expect(compacted.split("(")).toHaveLength(compacted.split(")").length);
  });
});

function createAdapter(fetchMock: jest.Mock, maxAttempts = 1) {
  return new BraveLinkedinDiscoveryAdapter("token", {
    fetch: fetchMock as typeof fetch,
    maxAttempts,
    minRequestIntervalMs: 0,
    sleep: jest.fn().mockResolvedValue(undefined),
  });
}

function query() {
  return {
    id: "q1",
    source: "LINKEDIN" as const,
    type: "XRAY" as const,
    label: "LinkedIn",
    query: "site:linkedin.com/in Senior QA Vietnam",
    searchUrl: "https://example.com",
    priority: 1,
  };
}

function jsonResponse(payload: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}
