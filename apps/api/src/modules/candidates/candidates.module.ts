import { Module } from "@nestjs/common";
import { AiModule } from "@/modules/ai";
import { AuthModule } from "@/modules/auth";
import { FilesModule } from "@/modules/files";
import { CandidatesController } from "./controller/index.controller";
import { CandidatesService } from "./service/index.service";
import { CvExportService } from "./export/cv-export.service";

@Module({
  imports: [AiModule, AuthModule, FilesModule],
  controllers: [CandidatesController],
  providers: [CandidatesService, CvExportService],
})
export class CandidatesModule {}
