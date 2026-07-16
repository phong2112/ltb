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
  "OLLAMA_TIMEOUT_MS",
  "OLLAMA_CONTEXT_LENGTH",
  "AI_JOB_ATTEMPTS",
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

  const aiProvider = String(config.AI_PROVIDER || "disabled");
  if (!["disabled", "ollama"].includes(aiProvider)) {
    throw new Error("AI_PROVIDER must be one of: disabled, ollama");
  }

  if (aiProvider === "ollama") {
    for (const key of ["REDIS_URL", "OLLAMA_BASE_URL", "OLLAMA_MODEL"]) {
      if (!hasValue(config[key])) {
        throw new Error(`${key} is required when AI_PROVIDER=ollama`);
      }
    }
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
