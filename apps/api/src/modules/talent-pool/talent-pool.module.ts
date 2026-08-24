import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MulterModule } from "@nestjs/platform-express";
import { AiModule } from "@/modules/ai";
import { AuthModule } from "@/modules/auth";
import { FilesModule } from "@/modules/files";
import { JobsModule } from "@/modules/jobs";
import { TalentPoolController } from "./talent-pool.controller";
import { TalentPoolService } from "./talent-pool.service";
import { createTalentPoolUploadOptions } from "./talent-pool-upload.options";

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
