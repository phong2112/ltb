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
    planSourcing: jest.fn(),
  };
  const gemini = { generateJson: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it("routes all core tasks through Groq when Groq is enabled", async () => {
    groq.analyzeMatch.mockResolvedValue({ score: 80 });
    groq.summarizeCv.mockResolvedValue({ overview: "Candidate summary" });
    groq.extractProfile.mockResolvedValue({ fullName: "Candidate" });
    groq.planSourcing.mockResolvedValue({ titleVariants: [], skillSignals: [] });
    const portal = new AiModelPortalService(createConfig({ AI_PROVIDER: "groq" }), groq as unknown as GroqAiProvider, gemini as unknown as GeminiProvider);

    await portal.analyzeMatch({} as never);
    await portal.summarizeCv({} as never);
    await portal.extractProfile({} as never);
    await portal.planSourcing({} as never);

    expect(groq.analyzeMatch).toHaveBeenCalledTimes(1);
    expect(groq.summarizeCv).toHaveBeenCalledTimes(1);
    expect(groq.extractProfile).toHaveBeenCalledTimes(1);
    expect(groq.planSourcing).toHaveBeenCalledTimes(1);
  });

  it("rejects core tasks when Groq is disabled", async () => {
    const portal = new AiModelPortalService(
      createConfig({ AI_PROVIDER: "disabled" }),
      groq as unknown as GroqAiProvider,
      gemini as unknown as GeminiProvider,
    );

    expect(() => portal.analyzeMatch({} as never)).toThrow("Groq AI is disabled");
    expect(groq.analyzeMatch).not.toHaveBeenCalled();
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
