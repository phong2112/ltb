import { Module } from "@nestjs/common";
import { AuthModule } from "@/modules/auth";
import { FilesModule } from "@/modules/files";
import { JobsController } from "./controller/index.controller";
import { JobsListGuard } from "./guards/jobs-list.guard";
import { JobsService } from "./service/index.service";

@Module({
  imports: [AuthModule, FilesModule],
  controllers: [JobsController],
  providers: [JobsService, JobsListGuard],
  exports: [JobsService],
})
export class JobsModule {}
