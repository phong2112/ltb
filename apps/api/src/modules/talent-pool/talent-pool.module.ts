import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { AuthModule } from "../auth/auth.module";
import { FilesModule } from "../files/files.module";
import { JobsModule } from "../jobs/jobs.module";
import { TalentPoolController } from "./talent-pool.controller";
import { TalentPoolService } from "./talent-pool.service";

@Module({
  imports: [AuthModule, FilesModule, AiModule, JobsModule],
  controllers: [TalentPoolController],
  providers: [TalentPoolService],
})
export class TalentPoolModule {}
