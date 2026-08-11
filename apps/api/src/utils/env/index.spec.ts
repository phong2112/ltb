import { validateEnv } from ".";

const requiredConfig = {
  DATABASE_URL: "postgresql://localhost/hr_copilot",
  WEB_ORIGIN: "http://localhost:8080",
  ADMIN_EMAIL: "admin@example.com",
  ADMIN_PASSWORD: "secret",
  JWT_ACCESS_TOKEN_SECRET: "access-secret",
  JWT_REFRESH_TOKEN_SECRET: "refresh-secret",
  CV_STORAGE_DRIVER: "local",
};

describe("validateEnv", () => {
  it("normalizes upload and rate-limit settings to numbers", () => {
    const result = validateEnv({
      ...requiredConfig,
      MAX_CV_FILE_SIZE_MB: "10",
      APPLICATION_RATE_LIMIT_MAX: "5",
      APPLICATION_RATE_LIMIT_WINDOW_SECONDS: "60",
      OCR_MIN_CONFIDENCE: "55",
      POOL_EXTRACTION_CONCURRENCY: "2",
      TRUST_PROXY_HOPS: "0",
    });

    expect(result).toMatchObject({
      MAX_CV_FILE_SIZE_MB: 10,
      APPLICATION_RATE_LIMIT_MAX: 5,
      APPLICATION_RATE_LIMIT_WINDOW_SECONDS: 60,
      OCR_MIN_CONFIDENCE: 55,
      POOL_EXTRACTION_CONCURRENCY: 2,
      TRUST_PROXY_HOPS: 0,
    });
  });

  it("rejects negative proxy hop counts", () => {
    expect(() => validateEnv({ ...requiredConfig, TRUST_PROXY_HOPS: "-1" }))
      .toThrow("TRUST_PROXY_HOPS must be a non-negative integer");
  });

  it("rejects unsupported email providers", () => {
    expect(() => validateEnv({ ...requiredConfig, EMAIL_PROVIDER: "smtp" }))
      .toThrow("EMAIL_PROVIDER must be gmail");
  });

  it("allows email sending to stay disabled when Gmail API settings are blank", () => {
    expect(() => validateEnv({ ...requiredConfig, EMAIL_PROVIDER: "gmail" })).not.toThrow();
  });

  it("requires complete Gmail API settings when email sending is configured", () => {
    expect(() => validateEnv({ ...requiredConfig, EMAIL_PROVIDER: "gmail", EMAIL_FROM: "sender@gmail.com" }))
      .toThrow("EMAIL_FROM, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN are required when Gmail API email is configured");
  });

  it("accepts complete Gmail API settings", () => {
    expect(() => validateEnv({
      ...requiredConfig,
      EMAIL_PROVIDER: "gmail",
      EMAIL_FROM: "Lường Bích <sender@gmail.com>",
      GMAIL_CLIENT_ID: "client-id.apps.googleusercontent.com",
      GMAIL_CLIENT_SECRET: "client-secret",
      GMAIL_REFRESH_TOKEN: "refresh-token",
    })).not.toThrow();
  });

  it("accepts Cloudflare R2 CV storage settings", () => {
    expect(() => validateEnv({
      ...requiredConfig,
      CV_STORAGE_DRIVER: "r2",
      R2_ENDPOINT: "https://account-id.r2.cloudflarestorage.com",
      R2_BUCKET: "candidate-cvs",
      R2_ACCESS_KEY_ID: "access-key-id",
      R2_SECRET_ACCESS_KEY: "secret-access-key",
    })).not.toThrow();
  });

  it("requires a bucket when Cloudflare R2 storage is enabled", () => {
    expect(() => validateEnv({
      ...requiredConfig,
      CV_STORAGE_DRIVER: "r2",
      R2_ENDPOINT: "https://account-id.r2.cloudflarestorage.com",
      R2_ACCESS_KEY_ID: "access-key-id",
      R2_SECRET_ACCESS_KEY: "secret-access-key",
    })).toThrow("Cloudflare R2 storage requires R2_BUCKET, STORAGE_BUCKET, or S3_BUCKET");
  });

  it("accepts S3-compatible aliases for Cloudflare R2 storage", () => {
    expect(() => validateEnv({
      ...requiredConfig,
      CV_STORAGE_DRIVER: "r2",
      S3_API: "https://account-id.r2.cloudflarestorage.com",
      S3_BUCKET: "candidate-cvs",
      s3_ACCESS_KEY: "access-key-id",
      s3_SECRET_KEY: "secret-access-key",
    })).not.toThrow();
  });

  it("requires Vercel Blob credentials when archive storage is enabled", () => {
    expect(() => validateEnv({
      ...requiredConfig,
      CV_ARCHIVE_STORAGE_DRIVER: "vercel-blob",
    })).toThrow("Vercel Blob archive storage requires BLOB_READ_WRITE_TOKEN");
  });

  it("accepts Vercel Blob as the archive storage tier", () => {
    expect(() => validateEnv({
      ...requiredConfig,
      CV_ARCHIVE_STORAGE_DRIVER: "vercel-blob",
      BLOB_READ_WRITE_TOKEN: "vercel-blob-token",
    })).not.toThrow();
  });

  it("accepts disabled AI without a Groq API key", () => {
    expect(() => validateEnv({ ...requiredConfig, AI_PROVIDER: "disabled" })).not.toThrow();
  });

  it("rejects unsupported AI providers", () => {
    expect(() => validateEnv({ ...requiredConfig, AI_PROVIDER: "local-ai" }))
      .toThrow("AI_PROVIDER must be one of: disabled, groq");
  });

  it("requires Groq credentials and Redis when AI is enabled", () => {
    expect(() => validateEnv({ ...requiredConfig, AI_PROVIDER: "groq" }))
      .toThrow("REDIS_URL is required when AI_PROVIDER=groq");

    expect(() => validateEnv({
      ...requiredConfig,
      AI_PROVIDER: "groq",
      REDIS_URL: "redis://localhost:6379",
    })).toThrow("GROQ_API_KEY is required when AI_PROVIDER=groq");
  });

  it("accepts valid Groq AI settings", () => {
    expect(() => validateEnv({
      ...requiredConfig,
      AI_PROVIDER: "groq",
      REDIS_URL: "redis://localhost:6379",
      GROQ_API_KEY: "gsk_test_key",
      GROQ_MODEL: "llama-3.3-70b-versatile",
      GROQ_TIMEOUT_MS: "120000",
    })).not.toThrow();
  });

  it("accepts disabled preview AI without Gemini credentials", () => {
    expect(() => validateEnv({ ...requiredConfig, PREVIEW_AI_PROVIDER: "disabled" })).not.toThrow();
  });

  it("rejects unsupported preview AI providers", () => {
    expect(() => validateEnv({ ...requiredConfig, PREVIEW_AI_PROVIDER: "local-ai" }))
      .toThrow("PREVIEW_AI_PROVIDER must be one of: disabled, gemini");
  });

  it("requires Gemini credentials when preview AI is enabled", () => {
    expect(() => validateEnv({ ...requiredConfig, PREVIEW_AI_PROVIDER: "gemini" }))
      .toThrow("GEMINI_API_KEY is required when PREVIEW_AI_PROVIDER=gemini");
  });

  it("accepts valid Gemini preview AI settings", () => {
    expect(() => validateEnv({
      ...requiredConfig,
      PREVIEW_AI_PROVIDER: "gemini",
      GEMINI_API_KEY: "gemini-api-key",
      GEMINI_MODEL: "gemini-2.5-flash",
      GEMINI_MODEL_CHAIN: "gemini-3.1-flash-lite,gemini-3.5-flash-lite",
      GEMINI_TIMEOUT_MS: "20000",
      GEMINI_QUOTA_COOLDOWN_MS: "60000",
    })).not.toThrow();
  });
});
