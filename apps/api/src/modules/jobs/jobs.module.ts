import { Module } from "@nestjs/common";
import { AuthModule } from "../auth";
import { FilesModule } from "../files";
import { JobsController } from "./controller/index.controller";
import { JobsService } from "./service/index.service";

@Module({
  imports: [AuthModule, FilesModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
