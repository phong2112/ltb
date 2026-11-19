const DURATION_PATTERN = /^(?:(\d+)h)?(?:(\d+)m(?!s))?(?:(\d+(?:\.\d+)?)s)?(?:(\d+)ms)?$/;

/**
 * Milliseconds to wait before retrying a Groq rate-limited request, or null when unknown.
 * `retry-after` is in seconds (HTTP); Groq messages use durations such as "7.5s" or "1m23.4s".
 */
export function parseRetryAfterMs(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const record = error as { headers?: unknown; message?: unknown };

  const retryAfterSeconds = Number(readHeader(record.headers, "retry-after"));
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) return Math.ceil(retryAfterSeconds * 1000);

  const message = typeof record.message === "string" ? record.message : "";
  const match = message.match(/try again in\s+([\dhms.]+)/i);
  return match ? parseDurationMs(match[1].replace(/\.$/, "")) : null;
}

export function parseDurationMs(value: string): number | null {
  const match = value.trim().match(DURATION_PATTERN);
  if (!match || !match.slice(1).some(Boolean)) return null;
  const [, hours, minutes, seconds, millis] = match;
  const total = Number(hours ?? 0) * 3_600_000 + Number(minutes ?? 0) * 60_000 + Number(seconds ?? 0) * 1000 + Number(millis ?? 0);
  return total > 0 ? Math.ceil(total) : null;
}

function readHeader(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  if (typeof (headers as { get?: unknown }).get === "function") return (headers as Headers).get(name) ?? undefined;
  const value = (headers as Record<string, unknown>)[name];
  return typeof value === "string" ? value : undefined;
}
