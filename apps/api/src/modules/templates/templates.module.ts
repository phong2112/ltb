import { Module } from "@nestjs/common";
import { AuthModule } from "@/modules/auth";
import { TemplatesController } from "./controller/index.controller";
import { TemplatesService } from "./service/index.service";

@Module({
  imports: [AuthModule],
  controllers: [TemplatesController],
  providers: [TemplatesService],
})
export class TemplatesModule {}
