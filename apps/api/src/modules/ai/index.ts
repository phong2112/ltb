import { Module } from "@nestjs/common";
import { FilesModule } from "../files";
import { JobsModule } from "../jobs";
import { CvTextExtractorService } from "./cv/extractor/index.service";
import { CvOcrService } from "./cv/ocr/index.service";
import { AI_PROVIDER } from "../../models/ai";
import { AiService } from "./processing/index.service";
import { GeminiProvider } from "./providers/gemini";
import { GroqAiProvider } from "./providers/groq";
import { AiQueueService } from "./queue/index.service";
import { TalentPoolProcessingService } from "./talent-pool/index.service";

@Module({
  imports: [FilesModule, JobsModule],
  providers: [
    GroqAiProvider,
    GeminiProvider,
    { provide: AI_PROVIDER, useExisting: GroqAiProvider },
    CvOcrService,
    CvTextExtractorService,
    AiService,
    TalentPoolProcessingService,
    AiQueueService,
  ],
  exports: [AiQueueService, CvTextExtractorService, TalentPoolProcessingService, AI_PROVIDER, GeminiProvider],
})
export class AiModule {}
