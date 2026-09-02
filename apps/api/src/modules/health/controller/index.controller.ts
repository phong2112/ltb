import { Controller, Get } from "@nestjs/common";
import { API_ROUTES } from "@hr-copilot/shared";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AiQueueService } from "@/modules/ai/queue/index.service";

@ApiTags("Health")
@Controller(API_ROUTES.health)
export class HealthController {
  constructor(private readonly aiQueueService: AiQueueService) {}

  @ApiOperation({ summary: "Check API health" })
  @ApiOkResponse({ description: "API health status." })
  @Get()
  check() {
    return {
      status: "ok",
      service: "hr-copilot-api",
      timestamp: new Date().toISOString(),
      aiQueues: this.aiQueueService.getMetrics(),
    };
  }
}
