import type { ConfigService } from "@nestjs/config";
import Groq from "groq-sdk";
import { z } from "zod";
import type { AnalyzeMatchInput, ProviderMatchAnalysis } from "./ai.types";
import { GroqAiProvider, parseStructuredResponse } from "./groq-ai.provider";

const mockCreate = jest.fn();

jest.mock("groq-sdk", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
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

  it("rejects schema-invalid JSON", () => {
    expect(() => parseStructuredResponse("{\"value\":123}", schema))
      .toThrow("Invalid structured AI response");
  });
});

describe("GroqAiProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns a validated match analysis from a Groq structured response", async () => {
    mockCreate.mockResolvedValueOnce(response(validAnalysis()));
    const provider = createProvider();

    await expect(provider.analyzeMatch(matchInput())).resolves.toMatchObject({
      summary: "Ứng viên phù hợp.",
    });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      response_format: { type: "json_object" },
    }));
  });

  it("repairs one invalid structured response and returns the valid retry", async () => {
    mockCreate
      .mockResolvedValueOnce(response({ summary: "missing required fields" }))
      .mockResolvedValueOnce(response(validAnalysis()));
    const provider = createProvider();

    await expect(provider.analyzeMatch(matchInput())).resolves.toMatchObject({
      summary: "Ứng viên phù hợp.",
    });
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockCreate.mock.calls[1][0].messages.at(-1).content)
      .toContain("không đúng schema");
  });

  it("normalizes partial Groq JSON responses instead of failing the job", async () => {
    mockCreate.mockResolvedValueOnce(response({
      evaluations: [{
        criterionId: "criterion-1",
        status: "met",
        evidence: "React",
        reason: "CV có nêu React.",
      }],
    }));
    const provider = createProvider();

    await expect(provider.analyzeMatch(matchInput())).resolves.toMatchObject({
      summary: expect.any(String),
      evaluations: [{
        criterionId: "criterion-1",
        status: "met",
        evidence: ["React"],
        reason: "CV có nêu React.",
      }],
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("unwraps nested match analysis payloads", async () => {
    mockCreate.mockResolvedValueOnce(response({
      result: validAnalysis(),
    }));
    const provider = createProvider();

    await expect(provider.analyzeMatch(matchInput())).resolves.toMatchObject({
      summary: "Ứng viên phù hợp.",
    });
  });

  it("throws after one repair attempt also returns invalid JSON", async () => {
    mockCreate
      .mockResolvedValueOnce(response("not-json"))
      .mockResolvedValueOnce(response("still-not-json"));
    const provider = createProvider();

    await expect(provider.analyzeMatch(matchInput()))
      .rejects.toThrow("Invalid structured AI response");
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("extracts a standalone talent-pool profile with a structured schema", async () => {
    mockCreate.mockResolvedValueOnce(response({
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
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      response_format: { type: "json_object" },
    }));
  });

  it("returns a standalone CV summary that is independent from match analysis", async () => {
    mockCreate.mockResolvedValueOnce(response({
      overview: "Frontend Engineer có kinh nghiệm xây dựng ứng dụng web.",
      currentTitle: "Frontend Engineer",
      totalExperience: "4 năm",
      keySkills: ["React", "TypeScript"],
      workHighlights: ["Phát triển dashboard nội bộ."],
      education: ["Đại học Công nghệ"],
      languages: ["Tiếng Việt", "Tiếng Anh"],
      notesForTa: ["CV có mô tả dự án web rõ ràng."],
    }));
    const provider = createProvider();

    await expect(provider.summarizeCv({
      cvText: "Frontend Engineer with React and TypeScript experience.",
    })).resolves.toMatchObject({
      overview: "Frontend Engineer có kinh nghiệm xây dựng ứng dụng web.",
      keySkills: ["React", "TypeScript"],
      workHighlights: ["Phát triển dashboard nội bộ."],
    });
    expect(mockCreate.mock.calls[0][0].messages[1].content).toContain("Đây KHÔNG phải phân tích match");
  });
});

function createProvider() {
  const config = {
    get: jest.fn((key: string) => ({
      GROQ_API_KEY: "gsk_test_key",
      GROQ_MODEL: "llama-3.3-70b-versatile",
      GROQ_TIMEOUT_MS: 120_000,
    })[key]),
  } as unknown as ConfigService;
  const provider = new GroqAiProvider(config);
  expect(Groq).toHaveBeenCalledTimes(1);
  expect(Groq).toHaveBeenCalledWith(expect.objectContaining({
    apiKey: "gsk_test_key",
    timeout: 120_000,
  }));
  return provider;
}

function response(content: unknown) {
  return {
    choices: [{
      message: {
        content: typeof content === "string" ? content : JSON.stringify(content),
      },
    }],
  };
}

function validAnalysis(): ProviderMatchAnalysis {
  return {
    summary: "Ứng viên phù hợp.",
    evaluations: [{
      criterionId: "criterion-1",
      status: "met",
      evidence: ["React"],
      reason: "Có bằng chứng.",
    }],
  };
}

function matchInput(): AnalyzeMatchInput {
  return {
    jobTitle: "Frontend Engineer",
    jobDescription: "Xây dựng ứng dụng web.",
    criteria: [{ id: "criterion-1", text: "React", importance: "required", constraintType: "hard_skill", required: true, blocker: false, weight: 2 }],
    cvText: "Ứng viên có 4 năm kinh nghiệm React.",
  };
}
