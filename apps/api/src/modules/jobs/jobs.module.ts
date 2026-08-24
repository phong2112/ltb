import { Module } from "@nestjs/common";
import { AuthModule } from "@/modules/auth";
import { FilesModule } from "@/modules/files";
import { JobsController } from "./controller/index.controller";
import { JobsService } from "./service/index.service";

@Module({
  imports: [AuthModule, FilesModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
