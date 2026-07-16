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
});
