import { Module } from "@nestjs/common";
import { CvStorageLifecycleService } from "./cv-storage-lifecycle.service";
import { CvStorageService } from "./cv-storage.service";

@Module({
  providers: [CvStorageService, CvStorageLifecycleService],
  exports: [CvStorageService, CvStorageLifecycleService],
})
export class FilesModule {}
