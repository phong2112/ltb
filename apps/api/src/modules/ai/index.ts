import { Module } from "@nestjs/common";
import { FilesModule } from "../files";
import { JobsModule } from "../jobs";
import { CvTextExtractorService } from "./cv/extractor/index.service";
import { CvOcrService } from "./cv/ocr/index.service";
import { AI_PROVIDER } from "../../models/ai";
import { AiService } from "./processing/index.service";
import { AiModelPortalService } from "./portal/index.service";
import { GeminiProvider } from "./providers/gemini";
import { GroqAiProvider } from "./providers/groq";
import { AiQueueService } from "./queue/index.service";
import { TalentPoolProcessingService } from "./talent-pool/index.service";

@Module({
  imports: [FilesModule, JobsModule],
  providers: [
    GroqAiProvider,
    GeminiProvider,
    AiModelPortalService,
    { provide: AI_PROVIDER, useExisting: AiModelPortalService },
    CvOcrService,
    CvTextExtractorService,
    AiService,
    TalentPoolProcessingService,
    AiQueueService,
  ],
  exports: [AiQueueService, CvTextExtractorService, TalentPoolProcessingService, AI_PROVIDER, AiModelPortalService],
})
export class AiModule {}
