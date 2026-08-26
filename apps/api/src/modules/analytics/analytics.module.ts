import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuthModule } from "@/modules/auth";
import { AnalyticsAdminController, AnalyticsEventsController } from "./controller";
import { AnalyticsOutcomeInterceptor } from "./interceptor";
import { AnalyticsService } from "./service";

@Global()
@Module({
  imports: [AuthModule],
  controllers: [AnalyticsEventsController, AnalyticsAdminController],
  providers: [AnalyticsService, { provide: APP_INTERCEPTOR, useClass: AnalyticsOutcomeInterceptor }],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
