import { parseDurationMs, parseRetryAfterMs } from "./retry-after";

describe("parseRetryAfterMs", () => {
  it("reads retry-after as seconds from SDK Headers", () => {
    expect(parseRetryAfterMs({ status: 429, headers: new Headers({ "retry-after": "7" }) })).toBe(7000);
  });

  it("reads retry-after from a plain header record", () => {
    expect(parseRetryAfterMs({ headers: { "retry-after": "1.5" } })).toBe(1500);
  });

  it("falls back to the duration in the Groq error message", () => {
    expect(parseRetryAfterMs({ message: "Rate limit reached on tokens per minute. Please try again in 7.56s." })).toBe(7560);
    expect(parseRetryAfterMs({ message: "Please try again in 1m23.5s" })).toBe(83_500);
  });

  it("returns null when no wait time is available", () => {
    expect(parseRetryAfterMs({ message: "rate limit exceeded" })).toBeNull();
    expect(parseRetryAfterMs(null)).toBeNull();
  });
});

describe("parseDurationMs", () => {
  it.each([
    ["7.66s", 7660],
    ["2m59.56s", 179_560],
    ["1h2m3s", 3_723_000],
    ["450ms", 450],
  ])("parses %s", (value, expected) => expect(parseDurationMs(value)).toBe(expected));

  it("rejects unknown formats", () => {
    expect(parseDurationMs("soon")).toBeNull();
    expect(parseDurationMs("")).toBeNull();
  });
});
