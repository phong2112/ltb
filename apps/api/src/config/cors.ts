import { ConfigService } from "@nestjs/config";

type CorsOriginCallback = (error: Error | null, allow?: boolean) => void;

type CorsMatcher = {
  exactOrigins: Set<string>;
  wildcardPatterns: RegExp[];
};

export function createCorsOriginOptions(config: ConfigService) {
  const matcher = createCorsMatcher([
    config.get<string>("WEB_ORIGIN"),
    config.get<string>("WEB_ORIGINS"),
  ]);

  return (origin: string | undefined, callback: CorsOriginCallback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    callback(null, isAllowedCorsOrigin(origin, matcher));
  };
}

function createCorsMatcher(values: Array<string | undefined>) {
  const matcher: CorsMatcher = {
    exactOrigins: new Set<string>(),
    wildcardPatterns: [],
  };

  for (const value of values) {
    for (const item of splitOrigins(value)) {
      if (item.includes("*")) {
        matcher.wildcardPatterns.push(wildcardOriginToRegExp(item));
        continue;
      }

      const origin = normalizeOrigin(item);
      if (origin) matcher.exactOrigins.add(origin);
    }
  }

  return matcher;
}

function isAllowedCorsOrigin(origin: string, matcher: CorsMatcher) {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;

  if (matcher.exactOrigins.has(normalized)) return true;
  return matcher.wildcardPatterns.some((pattern) => pattern.test(normalized));
}

function splitOrigins(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function wildcardOriginToRegExp(value: string) {
  const escaped = value
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, "[^.]+");

  return new RegExp(`^${escaped}$`);
}

export const corsTestInternals = {
  createCorsMatcher,
  isAllowedCorsOrigin,
};
