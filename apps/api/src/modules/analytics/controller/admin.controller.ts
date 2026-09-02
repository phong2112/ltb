import { Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { API_ROUTES } from "@hr-copilot/shared";
import { JwtAuthGuard } from "@/modules/auth/guards/index.guard";
import { AnalyticsService } from "../service";

@Controller(API_ROUTES.analytics.admin)
@UseGuards(JwtAuthGuard)
export class AnalyticsAdminController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get(API_ROUTES.analytics.overview) overview(@Query() query: Record<string, string | undefined>) { return this.analytics.overview(query); }
  @Get(API_ROUTES.analytics.features) features(@Query() query: Record<string, string | undefined>) { return this.analytics.features(query); }
  @Get(API_ROUTES.analytics.issues) issues(@Query() query: Record<string, string | undefined>) { return this.analytics.issues(query); }
  @Get(API_ROUTES.analytics.applicationFunnel) funnel(@Query() query: Record<string, string | undefined>) { return this.analytics.applicationFunnel(query); }
  @Get(API_ROUTES.analytics.events) events(@Query() query: Record<string, string | undefined>) { return this.analytics.recentEvents(query); }
  @Post(API_ROUTES.analytics.maintenance) maintenance() { return this.analytics.runMaintenance(); }
}
