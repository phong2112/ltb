import { Module } from "@nestjs/common";
import { CvStorageLifecycleService } from "./storage-lifecycle/index.service";
import { CvStorageService } from "./storage/index.service";

@Module({
  providers: [CvStorageService, CvStorageLifecycleService],
  exports: [CvStorageService, CvStorageLifecycleService],
})
export class FilesModule {}
