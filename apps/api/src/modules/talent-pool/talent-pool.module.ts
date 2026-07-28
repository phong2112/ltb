import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MulterModule } from "@nestjs/platform-express";
import { AiModule } from "../ai/ai.module";
import { AuthModule } from "../auth/auth.module";
import { FilesModule } from "../files/files.module";
import { JobsModule } from "../jobs/jobs.module";
import { TalentPoolController } from "./talent-pool.controller";
import { TalentPoolService } from "./talent-pool.service";
import { createTalentPoolUploadOptions } from "./cv-upload.options";

@Module({
  imports: [
    AuthModule,
    FilesModule,
    AiModule,
    JobsModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createTalentPoolUploadOptions(configService.get<number>("MAX_CV_FILE_SIZE_MB") ?? 10),
    }),
  ],
  controllers: [TalentPoolController],
  providers: [TalentPoolService],
})
export class TalentPoolModule {}