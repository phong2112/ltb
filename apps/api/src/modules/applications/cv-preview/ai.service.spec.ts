import type { ConfigService } from "@nestjs/config";
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
    }));

    await expect(service.extract({
      cvText: "Nguyen Van A\nHa Noi",
      fileName: "candidate.pdf",
      allowedApplicationAreas: ["Hà Nội"],
    })).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls Gemini and parses a structured preview response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                fullName: "Nguyễn Văn A",
                email: "a@example.com",
                phone: "0901234567",
                applicationArea: "Hà Nội",
                confidence: {
                  fullName: 0.9,
                  email: 0.98,
                  phone: 0.95,
                  applicationArea: 0.82,
                },
                evidence: {
                  fullName: "Nguyễn Văn A",
                  email: "a@example.com",
                  phone: "0901234567",
                  applicationArea: "Address: Ha Noi",
                },
              }),
            }],
          },
        }],
      }),
    }) as never;
    const service = new ApplicationCvPreviewAiService(createConfigService({
      PREVIEW_AI_PROVIDER: "gemini",
      GEMINI_API_KEY: "gemini-test-key",
      GEMINI_MODEL: "gemini-2.5-flash",
      GEMINI_BASE_URL: "https://generativelanguage.googleapis.com/v1beta",
      GEMINI_TIMEOUT_MS: 20_000,
    }));

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
    expect(global.fetch).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=gemini-test-key",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
  });
});

function createConfigService(values: Record<string, unknown>) {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}
