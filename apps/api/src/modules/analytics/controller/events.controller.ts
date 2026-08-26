import { Body, Controller, HttpCode, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { ProductEventBatchDto } from "../dto";
import { AnalyticsService } from "../service";

@Controller("analytics/events")
export class AnalyticsEventsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post("batch")
  @HttpCode(204)
  async ingest(@Body() dto: ProductEventBatchDto, @Req() request: Request) {
    await this.analytics.ingest(dto.events, request);
  }
}
