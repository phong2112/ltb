import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MulterModule } from "@nestjs/platform-express";
import { AiModule } from "../ai";
import { AuthModule } from "../auth";
import { FilesModule } from "../files";
import { JobsModule } from "../jobs";
import { TalentPoolController } from "./controller/index.controller";
import { TalentPoolService } from "./service/index.service";
import { createTalentPoolUploadOptions } from "./upload-options";

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
