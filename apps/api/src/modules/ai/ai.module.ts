import { Module } from "@nestjs/common";
import { FilesModule } from "@/modules/files";
import { CvTextExtractorService } from "./cv/extractor/index.service";
import { CvOcrService } from "./cv/ocr/index.service";
import { AI_PROVIDER } from "@/models/ai";
import { AiService } from "./processing/index.service";
import { AiModelPortalService } from "./portal/index.service";
import { GeminiProvider } from "./providers/gemini";
import { GroqAiProvider } from "./providers/groq";
import { AiQueueService } from "./queue/index.service";
import { TalentPoolJobBus } from "./talent-pool-job-bus.service";
import { TalentPoolProcessingService } from "./talent-pool/index.service";

@Module({
  imports: [FilesModule],
  providers: [
    GroqAiProvider,
    GeminiProvider,
    AiModelPortalService,
    { provide: AI_PROVIDER, useExisting: AiModelPortalService },
    CvOcrService,
    CvTextExtractorService,
    AiService,
    TalentPoolProcessingService,
    TalentPoolJobBus,
    AiQueueService,
  ],
  exports: [AiQueueService, CvTextExtractorService, TalentPoolProcessingService, TalentPoolJobBus, AI_PROVIDER, AiModelPortalService],
})
export class AiModule {}
