const requiredVariables = [
  "DATABASE_URL",
  "WEB_ORIGIN",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "JWT_ACCESS_TOKEN_SECRET",
  "JWT_REFRESH_TOKEN_SECRET",
];

const integerVariables = [
  "PORT",
  "MAX_CV_FILE_SIZE_MB",
  "JWT_ACCESS_TOKEN_TTL_SECONDS",
  "JWT_REFRESH_TOKEN_TTL_SECONDS",
  "APPLICATION_RATE_LIMIT_MAX",
  "APPLICATION_RATE_LIMIT_WINDOW_SECONDS",
];

const nonNegativeIntegerVariables = ["TRUST_PROXY_HOPS"];

export function validateEnv(config: Record<string, unknown>) {
  const validated = { ...config };

  for (const key of requiredVariables) {
    if (!hasValue(config[key])) {
      throw new Error(`${key} is required`);
    }
  }

  for (const key of integerVariables) {
    const value = config[key];
    if (!hasValue(value)) continue;

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`${key} must be a positive integer`);
    }

    validated[key] = parsed;
  }

  for (const key of nonNegativeIntegerVariables) {
    const value = config[key];
    if (!hasValue(value)) continue;

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error(`${key} must be a non-negative integer`);
    }

    validated[key] = parsed;
  }

  const sameSite = config.AUTH_COOKIE_SAMESITE;
  if (
    hasValue(sameSite) &&
    !["lax", "strict", "none"].includes(String(sameSite))
  ) {
    throw new Error("AUTH_COOKIE_SAMESITE must be one of: lax, strict, none");
  }

  const secureCookie = config.AUTH_COOKIE_SECURE;
  if (
    hasValue(secureCookie) &&
    !["true", "false"].includes(String(secureCookie))
  ) {
    throw new Error("AUTH_COOKIE_SECURE must be true or false");
  }

  const swaggerEnabled = config.SWAGGER_ENABLED;
  if (
    hasValue(swaggerEnabled) &&
    !["true", "false"].includes(String(swaggerEnabled))
  ) {
    throw new Error("SWAGGER_ENABLED must be true or false");
  }

  const storageDriver = config.CV_STORAGE_DRIVER;
  if (
    hasValue(storageDriver) &&
    !["local", "vercel-blob"].includes(String(storageDriver))
  ) {
    throw new Error("CV_STORAGE_DRIVER must be one of: local, vercel-blob");
  }

  if (
    String(storageDriver || "vercel-blob") === "vercel-blob" &&
    !hasVercelBlobCredentials(config)
  ) {
    throw new Error(
      "Vercel Blob storage requires BLOB_READ_WRITE_TOKEN, or BLOB_STORE_ID when running on Vercel with OIDC enabled",
    );
  }

  const emailProvider = config.EMAIL_PROVIDER;
  if (
    hasValue(emailProvider) &&
    String(emailProvider) !== "gmail"
  ) {
    throw new Error("EMAIL_PROVIDER must be gmail");
  }

  const hasEmailConfig =
    hasValue(config.EMAIL_FROM) ||
    hasValue(config.EMAIL_REPLY_TO) ||
    hasValue(config.EMAIL_SMTP_USER) ||
    hasValue(config.EMAIL_SMTP_PASS);
  if (
    hasEmailConfig &&
    (!hasValue(config.EMAIL_FROM) ||
      !hasValue(config.EMAIL_SMTP_USER) ||
      !hasValue(config.EMAIL_SMTP_PASS))
  ) {
    throw new Error("EMAIL_FROM, EMAIL_SMTP_USER, and EMAIL_SMTP_PASS are required when Gmail SMTP email is configured");
  }

  return validated;
}

function hasVercelBlobCredentials(config: Record<string, unknown>) {
  if (hasValue(config.BLOB_READ_WRITE_TOKEN)) return true;

  const hasOidcContext =
    hasValue(config.VERCEL) ||
    hasValue(config.VERCEL_ENV) ||
    hasValue(config.VERCEL_OIDC_TOKEN);
  return hasOidcContext && hasValue(config.BLOB_STORE_ID);
}

function hasValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}
