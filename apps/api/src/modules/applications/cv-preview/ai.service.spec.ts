import type { ConfigService } from "@nestjs/config";
import type { GeminiProvider } from "../../ai/providers/gemini";
import { ApplicationCvPreviewAiService } from "./ai.service";

describe("ApplicationCvPreviewAiService", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("skips Gemini when preview AI is disabled", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as never;
    const service = new ApplicationCvPreviewAiService(createConfigService({
      PREVIEW_AI_PROVIDER: "disabled",
    }), createGeminiProvider());

    await expect(service.extract({
      cvText: "Nguyen Van A\nHa Noi",
      fileName: "candidate.pdf",
      allowedApplicationAreas: ["Hà Nội"],
    })).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls Gemini and parses a structured preview response", async () => {
    const geminiProvider = createGeminiProvider({
      content: JSON.stringify({
        fullName: "Nguyễn Văn A",
        email: "a@example.com",
        phone: "0901234567",
        linkedinUrl: "https://www.linkedin.com/in/nguyen-van-a",
        applicationArea: "Hà Nội",
        confidence: {
          fullName: 0.9,
          email: 0.98,
          phone: 0.95,
          linkedinUrl: 0.9,
          applicationArea: 0.82,
        },
        evidence: {
          fullName: "Nguyễn Văn A",
          email: "a@example.com",
          phone: "0901234567",
          linkedinUrl: "LinkedIn: linkedin.com/in/nguyen-van-a",
          applicationArea: "Address: Ha Noi",
        },
      }),
      model: "gemini-3.1-flash-lite",
    });
    const service = new ApplicationCvPreviewAiService(createConfigService({
      PREVIEW_AI_PROVIDER: "gemini",
      GEMINI_API_KEY: "gemini-test-key",
      GEMINI_TIMEOUT_MS: 20_000,
    }), geminiProvider);

    const result = await service.extract({
      cvText: "Nguyễn Văn A\nAddress: Ha Noi\na@example.com\n0901234567",
      fileName: "candidate.pdf",
      allowedApplicationAreas: ["Hà Nội"],
    });

    expect(result).toMatchObject({
      fullName: "Nguyễn Văn A",
      applicationArea: "Hà Nội",
      confidence: expect.objectContaining({ applicationArea: 0.82 }),
    });
    expect(geminiProvider.generateJson).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: "gemini-test-key",
      timeoutMs: 20_000,
    }));
  });
});

function createConfigService(values: Record<string, unknown>) {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

function createGeminiProvider(result = { content: "{}", model: "gemini-test" }) {
  return {
    generateJson: jest.fn().mockResolvedValue(result),
  } as unknown as jest.Mocked<GeminiProvider>;
}
