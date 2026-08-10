import { Module } from "@nestjs/common";
import { AuthModule } from "../auth";
import { SourcingController } from "./controller/index.controller";
import { LinkedinDiscoveryService } from "./discovery/index.service";
import { InternalCandidateSuggestionService } from "./internal-suggestions/index.service";
import { SourcingService } from "./service/index.service";

@Module({
  imports: [AuthModule],
  controllers: [SourcingController],
  providers: [SourcingService, LinkedinDiscoveryService, InternalCandidateSuggestionService],
})
export class SourcingModule {}
