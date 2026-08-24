import { Module } from "@nestjs/common";
import { AiModule } from "../ai";
import { AuthModule } from "../auth";
import { FilesModule } from "../files";
import { CandidatesController } from "./controller/index.controller";
import { CandidatesService } from "./service/index.service";
import { CvExportService } from "./export/cv-export.service";

@Module({
  imports: [AiModule, AuthModule, FilesModule],
  controllers: [CandidatesController],
  providers: [CandidatesService, CvExportService],
})
export class CandidatesModule {}
