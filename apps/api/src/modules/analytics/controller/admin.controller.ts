import { Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "@/modules/auth/guards/index.guard";
import { AnalyticsService } from "../service";

@Controller("admin/analytics")
@UseGuards(JwtAuthGuard)
export class AnalyticsAdminController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("overview") overview(@Query() query: Record<string, string | undefined>) { return this.analytics.overview(query); }
  @Get("features") features(@Query() query: Record<string, string | undefined>) { return this.analytics.features(query); }
  @Get("issues") issues(@Query() query: Record<string, string | undefined>) { return this.analytics.issues(query); }
  @Get("funnels/application") funnel(@Query() query: Record<string, string | undefined>) { return this.analytics.applicationFunnel(query); }
  @Get("events") events(@Query() query: Record<string, string | undefined>) { return this.analytics.recentEvents(query); }
  @Post("maintenance") maintenance() { return this.analytics.runMaintenance(); }
}
