import { describe, expect, it, vi } from "vitest";
import { assertHealthUrl, pingRenderHealth } from "./index";

describe("pingRenderHealth", () => {
  it("calls the configured Render health endpoint", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, { status: 200 }),
    );

    await expect(
      pingRenderHealth("https://api.example.com/health", fetcher),
    ).resolves.toMatchObject({ status: 200 });

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.com/health",
      expect.objectContaining({ redirect: "follow" }),
    );
  });

  it("fails when Render returns a non-success response", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, { status: 503 }),
    );

    await expect(
      pingRenderHealth("https://api.example.com/health", fetcher),
    ).rejects.toThrow("HTTP 503");
  });
});

describe("assertHealthUrl", () => {
  it("rejects non-HTTPS and non-health URLs", () => {
    expect(() => assertHealthUrl("http://api.example.com/health")).toThrow();
    expect(() => assertHealthUrl("https://api.example.com/jobs")).toThrow();
  });
});
