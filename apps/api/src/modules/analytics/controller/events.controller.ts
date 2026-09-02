import { Body, Controller, HttpCode, Post, Req } from "@nestjs/common";
import { API_ROUTES } from "@hr-copilot/shared";
import type { Request } from "express";
import { ProductEventBatchDto } from "../dto";
import { AnalyticsService } from "../service";

@Controller(API_ROUTES.analytics.events)
export class AnalyticsEventsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post(API_ROUTES.analytics.eventsBatch)
  @HttpCode(204)
  async ingest(@Body() dto: ProductEventBatchDto, @Req() request: Request) {
    await this.analytics.ingest(dto.events, request);
  }
}
