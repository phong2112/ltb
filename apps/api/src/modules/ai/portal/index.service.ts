import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  AiProvider,
  AnalyzeMatchInput,
  ChatReplyResult,
  CvSummary,
  GenerateChatReplyInput,
  ExtractProfileInput,
  ExtractedProfile,
  ProviderMatchAnalysis,
  SourcingPlan,
  SourcingPlanInput,
  SummarizeCvInput,
} from "@/models/ai";
import { GeminiProvider, type GeminiGenerateInput, type GeminiGenerateResult } from "@/modules/ai/providers/gemini";
import { GroqAiProvider } from "@/modules/ai/providers/groq";

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

  /** Chat replies have their own switch because guest messages go to the provider. */
  get chatEnabled() {
    return (this.configService.get<string>("CHAT_AI_PROVIDER") ?? "disabled") === "groq";
  }

  generateChatReply(input: GenerateChatReplyInput): Promise<ChatReplyResult> {
    if (!this.chatEnabled) return Promise.reject(new Error("Chat AI is disabled"));
    return this.groqProvider.generateChatReply(input);
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

  planSourcing(input: SourcingPlanInput): Promise<SourcingPlan> {
    return this.requireGroq().planSourcing(input);
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
