import { validateEnv } from "./env.validation";

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
      TRUST_PROXY_HOPS: "0",
    });

    expect(result).toMatchObject({
      MAX_CV_FILE_SIZE_MB: 10,
      APPLICATION_RATE_LIMIT_MAX: 5,
      APPLICATION_RATE_LIMIT_WINDOW_SECONDS: 60,
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

  it("allows email sending to stay disabled when Gmail SMTP settings are blank", () => {
    expect(() => validateEnv({ ...requiredConfig, EMAIL_PROVIDER: "gmail" })).not.toThrow();
  });

  it("requires complete Gmail SMTP settings when email sending is configured", () => {
    expect(() => validateEnv({ ...requiredConfig, EMAIL_PROVIDER: "gmail", EMAIL_FROM: "sender@gmail.com" }))
      .toThrow("EMAIL_FROM, EMAIL_SMTP_USER, and EMAIL_SMTP_PASS are required when Gmail SMTP email is configured");
  });

  it("accepts complete Gmail SMTP settings", () => {
    expect(() => validateEnv({
      ...requiredConfig,
      EMAIL_PROVIDER: "gmail",
      EMAIL_FROM: "Lường Bích <sender@gmail.com>",
      EMAIL_SMTP_USER: "sender@gmail.com",
      EMAIL_SMTP_PASS: "google-app-password",
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
});
