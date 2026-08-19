import { AiModelPortalService } from "./index.service";
import type { ConfigService } from "@nestjs/config";
import type { GroqAiProvider } from "../providers/groq";
import type { GeminiProvider } from "../providers/gemini";

function createConfig(values: Record<string, string>) {
  return { get: <T>(key: string) => values[key] as T | undefined } as unknown as ConfigService;
}

describe("AiModelPortalService", () => {
  const groq = {
    name: "groq",
    model: "groq-default",
    analyzeMatch: jest.fn(),
    summarizeCv: jest.fn(),
    extractProfile: jest.fn(),
  };
  const gemini = { generateJson: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it("uses the legacy provider as the fallback for core tasks", () => {
    const portal = new AiModelPortalService(createConfig({ AI_PROVIDER: "groq" }), groq as unknown as GroqAiProvider, gemini as unknown as GeminiProvider);

    expect(portal.getTaskProvider("matching")).toBe("groq");
    expect(portal.getTaskProvider("summary")).toBe("groq");
    expect(portal.getTaskProvider("profile")).toBe("groq");
  });

  it("allows each core task to select its own provider", () => {
    const portal = new AiModelPortalService(createConfig({
      AI_PROVIDER: "groq",
      AI_MATCH_PROVIDER: "disabled",
      AI_SUMMARY_PROVIDER: "groq",
      AI_PROFILE_PROVIDER: "disabled",
    }), groq as unknown as GroqAiProvider, gemini as unknown as GeminiProvider);

    expect(portal.isTaskEnabled("matching")).toBe(false);
    expect(portal.isTaskEnabled("summary")).toBe(true);
    expect(portal.isTaskEnabled("profile")).toBe(false);
  });

  it("routes preview JSON to Gemini independently from core AI", async () => {
    const result = { content: "{}", model: "gemini-test" };
    gemini.generateJson.mockResolvedValue(result);
    const portal = new AiModelPortalService(
      createConfig({ AI_PROVIDER: "disabled", PREVIEW_AI_PROVIDER: "gemini" }),
      groq as unknown as GroqAiProvider,
      gemini as unknown as GeminiProvider,
    );

    await expect(portal.generatePreviewJson({
      apiKey: "key",
      prompt: "prompt",
      systemInstruction: "system",
    })).resolves.toEqual(result);
    expect(gemini.generateJson).toHaveBeenCalledTimes(1);
  });
});
