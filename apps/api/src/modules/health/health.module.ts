import { Module } from "@nestjs/common";
import { AiModule } from "@/modules/ai";
import { HealthController } from "./controller/index.controller";

@Module({
  imports: [AiModule],
  controllers: [HealthController],
})
export class HealthModule {}
