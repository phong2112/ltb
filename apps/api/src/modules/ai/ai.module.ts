import { Module } from "@nestjs/common";
import { FilesModule } from "@/modules/files";
import { CvTextExtractorService } from "./cv/extractor/index.service";
import { CvOcrService } from "./cv/ocr/index.service";
import { AiModelsModule } from "./models.module";
import { AiService } from "./processing/index.service";
import { AiQueueService } from "./queue/index.service";
import { TalentPoolJobBus } from "./talent-pool-job-bus.service";
import { TalentPoolProcessingService } from "./talent-pool/index.service";

@Module({
  imports: [FilesModule, AiModelsModule],
  providers: [
    CvOcrService,
    CvTextExtractorService,
    AiService,
    TalentPoolProcessingService,
    TalentPoolJobBus,
    AiQueueService,
  ],
  exports: [AiQueueService, CvTextExtractorService, TalentPoolProcessingService, TalentPoolJobBus, AiModelsModule],
})
export class AiModule {}
