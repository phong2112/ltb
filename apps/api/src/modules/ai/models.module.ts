import { Module } from "@nestjs/common";
import { AI_PROVIDER } from "@/models/ai";
import { AiModelPortalService } from "./portal/index.service";
import { GeminiProvider } from "./providers/gemini";
import { GroqAiProvider } from "./providers/groq";

/** Model providers only, without the CV processing pipeline, for features that just call a model. */
@Module({
  providers: [
    GroqAiProvider,
    GeminiProvider,
    AiModelPortalService,
    { provide: AI_PROVIDER, useExisting: AiModelPortalService },
  ],
  exports: [AI_PROVIDER, AiModelPortalService],
})
export class AiModelsModule {}
