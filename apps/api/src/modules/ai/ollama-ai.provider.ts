import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Ollama } from "ollama";
import { z } from "zod";
import { buildMatchPrompt } from "./ai.prompt";
import type { AiProvider, AnalyzeMatchInput, ProviderMatchAnalysis } from "./ai.types";

const matchAnalysisSchema = z.object({
  profile: z.object({
    currentRole: z.string().nullable(),
    totalYearsExperience: z.number().min(0).max(60).nullable(),
    skills: z.array(z.string()).max(30),
    languages: z.array(z.string()).max(10),
  }),
  summary: z.string().min(1).max(1200),
  evaluations: z.array(z.object({
    criterionId: z.string(),
    status: z.enum(["met", "partial", "not_met", "unknown"]),
    evidence: z.array(z.string()).max(3),
    reason: z.string().min(1).max(500),
  })).max(20),
  strengths: z.array(z.string()).max(6),
  risks: z.array(z.string()).max(6),
  screeningQuestions: z.array(z.string()).max(6),
});

@Injectable()
export class OllamaAiProvider implements AiProvider {
  readonly name = "ollama";
  readonly model: string;
  private readonly client: Ollama;
  private readonly contextLength: number;

  constructor(configService: ConfigService) {
    const host = configService.get<string>("OLLAMA_BASE_URL") ?? "http://localhost:11434";
    const timeoutMs = configService.get<number>("OLLAMA_TIMEOUT_MS") ?? 180_000;

    this.model = configService.get<string>("OLLAMA_MODEL") ?? "qwen3:4b";
    this.contextLength = configService.get<number>("OLLAMA_CONTEXT_LENGTH") ?? 16_384;
    this.client = new Ollama({ host, fetch: createTimeoutFetch(timeoutMs) });
  }

  async analyzeMatch(input: AnalyzeMatchInput): Promise<ProviderMatchAnalysis> {
    const response = await this.client.chat({
      model: this.model,
      stream: false,
      think: false,
      keep_alive: "10m",
      format: z.toJSONSchema(matchAnalysisSchema),
      options: {
        temperature: 0,
        num_ctx: this.contextLength,
      },
      messages: [
        {
          role: "system",
          content: "Bạn là trợ lý tuyển dụng. Kết quả chỉ hỗ trợ HR ra quyết định và phải dựa trên bằng chứng trong CV.",
        },
        {
          role: "user",
          content: buildMatchPrompt(input),
        },
      ],
    });

    return matchAnalysisSchema.parse(JSON.parse(response.message.content) as unknown);
  }
}

function createTimeoutFetch(timeoutMs: number): typeof fetch {
  return (input, init) => {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal
      ? AbortSignal.any([init.signal, timeoutSignal])
      : timeoutSignal;

    return fetch(input, { ...init, signal });
  };
}
