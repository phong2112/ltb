import { Module } from "@nestjs/common";
import { CvStorageService } from "./cv-storage.service";

@Module({
  providers: [CvStorageService],
  exports: [CvStorageService],
})
export class FilesModule {}
