import { Module } from "@nestjs/common";
import { FilesModule } from "../files/files.module";
import { JobsModule } from "../jobs/jobs.module";
import { AiQueueService } from "./ai-queue.service";
import { AiService } from "./ai.service";
import { AI_PROVIDER } from "./ai.types";
import { CvOcrService } from "./cv-ocr.service";
import { CvTextExtractorService } from "./cv-text-extractor.service";
import { GroqAiProvider } from "./groq-ai.provider";
import { TalentPoolProcessingService } from "./talent-pool-processing.service";

@Module({
  imports: [FilesModule, JobsModule],
  providers: [
    GroqAiProvider,
    { provide: AI_PROVIDER, useExisting: GroqAiProvider },
    CvOcrService,
    CvTextExtractorService,
    AiService,
    TalentPoolProcessingService,
    AiQueueService,
  ],
  exports: [AiQueueService, CvTextExtractorService, TalentPoolProcessingService, AI_PROVIDER],
})
export class AiModule {}
