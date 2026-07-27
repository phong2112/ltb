import type { ConfigService } from "@nestjs/config";
import { Ollama } from "ollama";
import { z } from "zod";
import type { AnalyzeMatchInput, ProviderMatchAnalysis } from "./ai.types";
import { OllamaAiProvider, parseStructuredResponse } from "./ollama-ai.provider";

const mockChat = jest.fn();

jest.mock("ollama", () => ({
  Ollama: jest.fn().mockImplementation(() => ({ chat: mockChat })),
}));

describe("parseStructuredResponse", () => {
  const schema = z.object({ value: z.string() });

  it("parses JSON wrapped in a markdown code fence", () => {
    expect(parseStructuredResponse("```json\n{\"value\":\"ok\"}\n```", schema))
      .toEqual({ value: "ok" });
  });

  it("extracts the first balanced JSON object from surrounding text", () => {
    expect(parseStructuredResponse('Kết quả: {"value":"ok"}. Hoàn tất.', schema))
      .toEqual({ value: "ok" });
  });
});

describe("OllamaAiProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("repairs one invalid structured response and returns the valid retry", async () => {
    mockChat
      .mockResolvedValueOnce(response({ summary: "missing required fields" }))
      .mockResolvedValueOnce(response(validAnalysis()));
    const provider = createProvider();

    await expect(provider.analyzeMatch(matchInput())).resolves.toMatchObject({
      summary: "Ứng viên phù hợp.",
    });
    expect(mockChat).toHaveBeenCalledTimes(2);
    expect(mockChat.mock.calls[1][0].messages.at(-1).content)
      .toContain("không đúng schema");
  });

  it("throws after exactly one repair attempt also returns invalid JSON", async () => {
    mockChat
      .mockResolvedValueOnce(response("not-json"))
      .mockResolvedValueOnce(response("still-not-json"));
    const provider = createProvider();

    await expect(provider.analyzeMatch(matchInput()))
      .rejects.toThrow("Invalid structured AI response");
    expect(mockChat).toHaveBeenCalledTimes(2);
  });

  it("extracts a standalone talent-pool profile with a structured schema", async () => {
    mockChat.mockResolvedValueOnce(response({
      fullName: "Nguyen Van A",
      title: "Frontend Engineer",
      totalYearsExperience: 4,
      skills: ["React", "TypeScript"],
      languages: ["Vietnamese", "English"],
    }));
    const provider = createProvider();

    await expect(provider.extractProfile({
      fileName: "nguyen-van-a.pdf",
      cvText: "Nguyen Van A has four years of React experience.",
    })).resolves.toEqual({
      fullName: "Nguyen Van A",
      title: "Frontend Engineer",
      yearsExperience: 4,
      skills: ["React", "TypeScript"],
      languages: ["Vietnamese", "English"],
    });
    expect(mockChat).toHaveBeenCalledWith(expect.objectContaining({
      stream: false,
      think: false,
      keep_alive: "10m",
      format: expect.any(Object),
      options: { temperature: 0, num_ctx: 4096 },
    }));
  });
});

function createProvider() {
  const config = {
    get: jest.fn((key: string) => ({
      OLLAMA_BASE_URL: "http://ollama:11434",
      OLLAMA_MODEL: "qwen3:4b",
      OLLAMA_TIMEOUT_MS: 30_000,
      OLLAMA_CONTEXT_LENGTH: 4_096,
    })[key]),
  } as unknown as ConfigService;
  const provider = new OllamaAiProvider(config);
  expect(Ollama).toHaveBeenCalledTimes(1);
  return provider;
}

function response(content: unknown) {
  return {
    message: {
      content: typeof content === "string" ? content : JSON.stringify(content),
    },
  };
}

function validAnalysis(): ProviderMatchAnalysis {
  return {
    profile: {
      currentRole: "Frontend Engineer",
      totalYearsExperience: 4,
      skills: ["React"],
      languages: ["Tiếng Việt"],
    },
    summary: "Ứng viên phù hợp.",
    evaluations: [{
      criterionId: "criterion-1",
      status: "met",
      evidence: ["React"],
      reason: "Có bằng chứng.",
    }],
    strengths: ["React"],
    risks: [],
    screeningQuestions: ["Kinh nghiệm gần nhất?"],
  };
}

function matchInput(): AnalyzeMatchInput {
  return {
    jobTitle: "Frontend Engineer",
    jobDescription: "Xây dựng ứng dụng web.",
    criteria: [{ id: "criterion-1", text: "React", required: true, weight: 2 }],
    cvText: "Ứng viên có 4 năm kinh nghiệm React.",
  };
}
