import type { ConfigService } from "@nestjs/config";
import { GeminiProvider } from ".";

describe("GeminiProvider", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("uses the configured model chain and falls back after a quota error", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(createResponse(429, {}))
      .mockResolvedValueOnce(createResponse(200, {
        candidates: [{
          content: {
            parts: [{ text: "{\"ok\":true}" }],
          },
        }],
      })) as never;
    const provider = new GeminiProvider(createConfigService({
      GEMINI_BASE_URL: "https://generativelanguage.googleapis.com/v1beta",
      GEMINI_MODEL_CHAIN: "gemini-3.1-flash-lite, gemini-3.5-flash-lite",
      GEMINI_QUOTA_COOLDOWN_MS: 60_000,
    }));

    const result = await provider.generateJson({
      apiKey: "gemini-test-key",
      prompt: "Extract JSON",
      systemInstruction: "Return JSON",
      timeoutMs: 20_000,
    });

    expect(result).toEqual({ content: "{\"ok\":true}", model: "gemini-3.5-flash-lite" });
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=gemini-test-key",
      expect.objectContaining({ method: "POST" }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=gemini-test-key",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("keeps legacy GEMINI_MODEL behavior when a model chain is not configured", async () => {
    global.fetch = jest.fn().mockResolvedValue(createResponse(200, {
      candidates: [{
        content: {
          parts: [{ text: "{\"ok\":true}" }],
        },
      }],
    })) as never;
    const provider = new GeminiProvider(createConfigService({
      GEMINI_BASE_URL: "https://generativelanguage.googleapis.com/v1beta",
      GEMINI_MODEL: "gemini-2.5-flash",
    }));

    await provider.generateJson({
      apiKey: "gemini-test-key",
      prompt: "Extract JSON",
      systemInstruction: "Return JSON",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=gemini-test-key",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

function createResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: jest.fn(),
    },
    json: jest.fn().mockResolvedValue(body),
  };
}

function createConfigService(values: Record<string, unknown>) {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}
