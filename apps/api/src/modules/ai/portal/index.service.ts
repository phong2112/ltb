import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  AiProvider,
  AnalyzeMatchInput,
  CvSummary,
  ExtractProfileInput,
  ExtractedProfile,
  ProviderMatchAnalysis,
  SummarizeCvInput,
} from "../../../models/ai";
import { GeminiProvider, type GeminiGenerateInput, type GeminiGenerateResult } from "../providers/gemini";
import { GroqAiProvider } from "../providers/groq";

/** Routes product AI tasks to the provider/model chain dedicated to that task. */
@Injectable()
export class AiModelPortalService implements AiProvider {
  readonly name = "groq";
  readonly model: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly groqProvider: GroqAiProvider,
    private readonly geminiProvider: GeminiProvider,
  ) {
    this.model = groqProvider.model;
  }

  get groqEnabled() {
    return (this.configService.get<string>("AI_PROVIDER") ?? "disabled") === "groq";
  }

  get previewEnabled() {
    return (this.configService.get<string>("PREVIEW_AI_PROVIDER") ?? "disabled") === "gemini";
  }

  analyzeMatch(input: AnalyzeMatchInput): Promise<ProviderMatchAnalysis> {
    return this.requireGroq().analyzeMatch(input);
  }

  summarizeCv(input: SummarizeCvInput): Promise<CvSummary> {
    return this.requireGroq().summarizeCv(input);
  }

  extractProfile(input: ExtractProfileInput): Promise<ExtractedProfile> {
    return this.requireGroq().extractProfile(input);
  }

  generatePreviewJson(input: GeminiGenerateInput): Promise<GeminiGenerateResult> {
    if (!this.previewEnabled) return Promise.reject(new Error("Gemini preview AI is disabled"));
    return this.geminiProvider.generateJson(input);
  }

  private requireGroq() {
    if (!this.groqEnabled) throw new Error("Groq AI is disabled");
    return this.groqProvider;
  }
}
