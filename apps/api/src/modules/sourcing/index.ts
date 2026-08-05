import { Module } from "@nestjs/common";
import { AuthModule } from "../auth";
import { SourcingController } from "./controller/index.controller";
import { SourcingService } from "./service/index.service";

@Module({
  imports: [AuthModule],
  controllers: [SourcingController],
  providers: [SourcingService],
})
export class SourcingModule {}
