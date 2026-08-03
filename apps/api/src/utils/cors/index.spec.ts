import { ConfigService } from "@nestjs/config";
import { createCorsOriginOptions } from ".";

describe("createCorsOriginOptions", () => {
  it("allows the primary web origin", () => {
    const origin = createCorsOriginOptions(
      new ConfigService({
        WEB_ORIGIN: "https://ltb-careers.vercel.app",
      }),
    );

    expect(resolveOrigin(origin, "https://ltb-careers.vercel.app")).toBe(true);
  });

  it("allows comma-separated extra origins and simple wildcard hosts", () => {
    const origin = createCorsOriginOptions(
      new ConfigService({
        WEB_ORIGIN: "https://ltb-careers.vercel.app",
        WEB_ORIGINS:
          "https://admin.example.com, https://ltb-*-flywithmarthphams-projects.vercel.app",
      }),
    );

    expect(resolveOrigin(origin, "https://admin.example.com")).toBe(true);
    expect(
      resolveOrigin(
        origin,
        "https://ltb-7ocztyjhj-flywithmarthphams-projects.vercel.app",
      ),
    ).toBe(true);
  });

  it("rejects origins outside the allowlist", () => {
    const origin = createCorsOriginOptions(
      new ConfigService({
        WEB_ORIGIN: "https://ltb-careers.vercel.app",
      }),
    );

    expect(resolveOrigin(origin, "https://example.com")).toBe(false);
  });

  it("allows requests without a browser origin header", () => {
    const origin = createCorsOriginOptions(
      new ConfigService({
        WEB_ORIGIN: "https://ltb-careers.vercel.app",
      }),
    );

    expect(resolveOrigin(origin, undefined)).toBe(true);
  });
});

function resolveOrigin(
  origin: ReturnType<typeof createCorsOriginOptions>,
  value: string | undefined,
) {
  let result = false;
  origin(value, (error, allow) => {
    if (error) throw error;
    result = allow === true;
  });
  return result;
}
