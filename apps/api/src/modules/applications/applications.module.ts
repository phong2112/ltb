import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MulterModule } from "@nestjs/platform-express";
import { ThrottlerModule } from "@nestjs/throttler";
import { AiModule } from "../ai";
import { FilesModule } from "../files";
import { JobsModule } from "../jobs";
import { NotificationsModule } from "../notifications";
import { ApplicationsController } from "./controller/index.controller";
import { ApplicationCvPreviewAiService } from "./cv-preview/ai.service";
import { ApplicationCvPreviewService } from "./cv-preview/index.service";
import { ApplicationsService } from "./service/index.service";
import { createCvUploadOptions } from "./upload-options";

@Module({
  imports: [
    AiModule,
    FilesModule,
    JobsModule,
    NotificationsModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          limit: configService.get<number>("APPLICATION_RATE_LIMIT_MAX") ?? 5,
          ttl: (configService.get<number>("APPLICATION_RATE_LIMIT_WINDOW_SECONDS") ?? 60) * 1000,
        },
      ],
    }),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createCvUploadOptions(configService.get<number>("MAX_CV_FILE_SIZE_MB") ?? 10),
    }),
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, ApplicationCvPreviewService, ApplicationCvPreviewAiService],
})
export class ApplicationsModule {}
