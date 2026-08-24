import { Module } from "@nestjs/common";
import { AiModule } from "@/modules/ai/ai.module";
import { AuthModule } from "@/modules/auth";
import { SourcingController } from "./controller/index.controller";
import { LinkedinDiscoveryService } from "./discovery/index.service";
import { InternalCandidateSuggestionService } from "./internal-suggestions/index.service";
import { SourcingOrchestrationService } from "./orchestration/index.service";
import { SourcingOrchestrationQueueService } from "./queue/index.service";
import { SourcingService } from "./service/index.service";

@Module({
  imports: [AuthModule, AiModule],
  controllers: [SourcingController],
  providers: [
    SourcingService,
    LinkedinDiscoveryService,
    InternalCandidateSuggestionService,
    SourcingOrchestrationService,
    SourcingOrchestrationQueueService,
  ],
})
export class SourcingModule {}
