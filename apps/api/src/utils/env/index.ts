const requiredVariables = [
  "DATABASE_URL",
  "REDIS_URL",
  "WEB_ORIGIN",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "JWT_ACCESS_TOKEN_SECRET",
  "JWT_REFRESH_TOKEN_SECRET",
  "CHAT_REALTIME_TICKET_SECRET",
];

const integerVariables = [
  "PORT",
  "MAX_CV_FILE_SIZE_MB",
  "JWT_ACCESS_TOKEN_TTL_SECONDS",
  "JWT_REFRESH_TOKEN_TTL_SECONDS",
  "GROQ_TIMEOUT_MS",
  "GROQ_SOURCING_TIMEOUT_MS",
  "GEMINI_TIMEOUT_MS",
  "GEMINI_QUOTA_COOLDOWN_MS",
  "AI_JOB_ATTEMPTS",
  "CV_EXTRACTION_CONCURRENCY",
  "AI_MATCH_CONCURRENCY",
  "POOL_EXTRACTION_CONCURRENCY",
  "OCR_MAX_PAGES",
  "OCR_MIN_CONFIDENCE",
  "OCR_TIMEOUT_MS",
  "ANALYTICS_RATE_LIMIT_MAX",
  "ANALYTICS_RATE_LIMIT_WINDOW_SECONDS",
  "ANALYTICS_RAW_RETENTION_DAYS",
  "APPLICATION_RATE_LIMIT_MAX",
  "APPLICATION_RATE_LIMIT_WINDOW_SECONDS",
  "GUEST_CHAT_SESSION_TTL_DAYS",
  "GUEST_CHAT_RECOVERY_TTL_DAYS",
  "GUEST_CHAT_RATE_LIMIT_MAX",
  "GUEST_CHAT_RATE_LIMIT_WINDOW_SECONDS",
  "CHAT_REALTIME_TICKET_TTL_SECONDS",
  "SOURCING_DISCOVERY_MAX_QUERIES_PER_CAMPAIGN",
  "SOURCING_DISCOVERY_RESULTS_PER_QUERY",
  "SOURCING_DISCOVERY_TIMEOUT_MS",
  "SOURCING_DISCOVERY_MAX_ATTEMPTS",
  "SOURCING_ORCHESTRATION_STALE_MINUTES",
];

const nonNegativeIntegerVariables = ["TRUST_PROXY_HOPS", "SOURCING_DISCOVERY_MIN_INTERVAL_MS"];

export function validateEnv(config: Record<string, unknown>) {
  const validated = { ...config };

  for (const key of requiredVariables) {
    if (!hasValue(config[key])) {
      throw new Error(`${key} is required`);
    }
  }

  if (String(config.CHAT_REALTIME_TICKET_SECRET).length < 32) {
    throw new Error("CHAT_REALTIME_TICKET_SECRET must be at least 32 characters");
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

  for (const key of ["ANALYTICS_ENABLED", "ANALYTICS_ADMIN_ENABLED"]) {
    if (hasValue(config[key]) && !["true", "false"].includes(String(config[key]))) {
      throw new Error(` must be true or false`);
    }
  }
  if (String(config.ANALYTICS_ENABLED || "false") === "true" && !hasValue(config.ANALYTICS_HMAC_SECRET)) {
    throw new Error("ANALYTICS_HMAC_SECRET is required when ANALYTICS_ENABLED=true");
  }

  const sourcingDiscoveryEnabled = config.SOURCING_DISCOVERY_ENABLED;
  if (
    hasValue(sourcingDiscoveryEnabled) &&
    !["true", "false"].includes(String(sourcingDiscoveryEnabled))
  ) {
    throw new Error("SOURCING_DISCOVERY_ENABLED must be true or false");
  }

  if (String(sourcingDiscoveryEnabled || "false") === "true" && !hasValue(config.BRAVE_SEARCH_API_KEY)) {
    throw new Error("BRAVE_SEARCH_API_KEY is required when SOURCING_DISCOVERY_ENABLED=true");
  }

  const storageDriver = config.CV_STORAGE_DRIVER;
  if (
    hasValue(storageDriver) &&
    !["local", "vercel-blob", "r2"].includes(String(storageDriver))
  ) {
    throw new Error("CV_STORAGE_DRIVER must be one of: local, vercel-blob, r2");
  }

  if (
    String(storageDriver || "r2") === "vercel-blob" &&
    !hasVercelBlobCredentials(config)
  ) {
    throw new Error(
      "Vercel Blob storage requires BLOB_READ_WRITE_TOKEN, or BLOB_STORE_ID when running on Vercel with OIDC enabled",
    );
  }

  if (String(storageDriver || "r2") === "r2") {
    validateR2Config(config);
  }

  const archiveStorageDriver = config.CV_ARCHIVE_STORAGE_DRIVER;
  if (
    hasValue(archiveStorageDriver) &&
    String(archiveStorageDriver) !== "vercel-blob"
  ) {
    throw new Error("CV_ARCHIVE_STORAGE_DRIVER must be vercel-blob");
  }

  if (
    String(archiveStorageDriver || "") === "vercel-blob" &&
    !hasVercelBlobCredentials(config)
  ) {
    throw new Error(
      "Vercel Blob archive storage requires BLOB_READ_WRITE_TOKEN, or BLOB_STORE_ID when running on Vercel with OIDC enabled",
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
    hasValue(config.GMAIL_CLIENT_ID) ||
    hasValue(config.GMAIL_CLIENT_SECRET) ||
    hasValue(config.GMAIL_REFRESH_TOKEN);
  if (
    hasEmailConfig &&
    (!hasValue(config.EMAIL_FROM) ||
      !hasValue(config.GMAIL_CLIENT_ID) ||
      !hasValue(config.GMAIL_CLIENT_SECRET) ||
      !hasValue(config.GMAIL_REFRESH_TOKEN))
  ) {
    throw new Error("EMAIL_FROM, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN are required when Gmail API email is configured");
  }

  const aiProvider = String(config.AI_PROVIDER || "disabled");
  if (!["disabled", "groq"].includes(aiProvider)) {
    throw new Error("AI_PROVIDER must be one of: disabled, groq");
  }

  if (aiProvider === "groq") {
    for (const key of ["REDIS_URL", "GROQ_API_KEY"]) {
      if (!hasValue(config[key])) {
        throw new Error(`${key} is required when AI_PROVIDER=groq`);
      }
    }
  }

  const previewAiProvider = String(config.PREVIEW_AI_PROVIDER || "disabled");
  if (!["disabled", "gemini"].includes(previewAiProvider)) {
    throw new Error("PREVIEW_AI_PROVIDER must be one of: disabled, gemini");
  }

  if (previewAiProvider === "gemini" && !hasValue(config.GEMINI_API_KEY)) {
    throw new Error("GEMINI_API_KEY is required when PREVIEW_AI_PROVIDER=gemini");
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

function validateR2Config(config: Record<string, unknown>) {
  const endpointOrAccountId = getFirstValue(config, [
    "R2_ENDPOINT",
    "STORAGE_ENDPOINT",
    "S3_API",
    "CLOUD_FLARE_STORAGE_ACCOUNT_ID",
    "CLOUDFLARE_R2_ACCOUNT_ID",
  ]);
  const bucket = getFirstValue(config, [
    "R2_BUCKET",
    "R2_BUCKET_NAME",
    "STORAGE_BUCKET",
    "S3_BUCKET",
    "S3_BUCKET_NAME",
    "s3_BUCKET",
    "s3_BUCKET_NAME",
  ]);
  const accessKeyId = getFirstValue(config, [
    "R2_ACCESS_KEY_ID",
    "STORAGE_ACCESS_KEY_ID",
    "S3_ACCESS_KEY_ID",
    "s3_ACCESS_KEY",
  ]);
  const secretAccessKey = getFirstValue(config, [
    "R2_SECRET_ACCESS_KEY",
    "STORAGE_SECRET_ACCESS_KEY",
    "S3_SECRET_ACCESS_KEY",
    "s3_SECRET_ACCESS_KEY",
    "S3_SECRET_KEY",
    "s3_SECRET_KEY",
  ]);

  if (!endpointOrAccountId) {
    throw new Error("Cloudflare R2 storage requires R2_ENDPOINT or CLOUDFLARE_R2_ACCOUNT_ID");
  }

  if (!bucket) {
    throw new Error("Cloudflare R2 storage requires R2_BUCKET, STORAGE_BUCKET, or S3_BUCKET");
  }

  if (!accessKeyId) {
    throw new Error("Cloudflare R2 storage requires R2_ACCESS_KEY_ID, STORAGE_ACCESS_KEY_ID, or s3_ACCESS_KEY");
  }

  if (!secretAccessKey) {
    throw new Error("Cloudflare R2 storage requires R2_SECRET_ACCESS_KEY, STORAGE_SECRET_ACCESS_KEY, or s3_SECRET_KEY");
  }
}

function getFirstValue(config: Record<string, unknown>, keys: string[]) {
  return keys.find(key => hasValue(config[key]));
}

function hasValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}
