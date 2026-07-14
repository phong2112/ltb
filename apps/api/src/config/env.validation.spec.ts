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
});
