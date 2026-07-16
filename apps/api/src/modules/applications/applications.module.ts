import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MulterModule } from "@nestjs/platform-express";
import { ThrottlerModule } from "@nestjs/throttler";
import { AiModule } from "../ai/ai.module";
import { FilesModule } from "../files/files.module";
import { JobsModule } from "../jobs/jobs.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ApplicationsController } from "./applications.controller";
import { ApplicationsService } from "./applications.service";
import { createCvUploadOptions } from "./cv-upload.options";

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
      useFactory: (configService: ConfigService) => createCvUploadOptions(configService.get<number>("MAX_CV_FILE_SIZE_MB") ?? 10),
    }),
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
