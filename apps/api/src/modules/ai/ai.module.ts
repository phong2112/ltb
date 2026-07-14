import { Module } from "@nestjs/common";
import { FilesModule } from "../files/files.module";
import { AiQueueService } from "./ai-queue.service";
import { AiService } from "./ai.service";
import { AI_PROVIDER } from "./ai.types";
import { CvTextExtractorService } from "./cv-text-extractor.service";
import { OllamaAiProvider } from "./ollama-ai.provider";

@Module({
  imports: [FilesModule],
  providers: [
    OllamaAiProvider,
    { provide: AI_PROVIDER, useExisting: OllamaAiProvider },
    CvTextExtractorService,
    AiService,
    AiQueueService,
  ],
  exports: [AiQueueService],
})
export class AiModule {}
