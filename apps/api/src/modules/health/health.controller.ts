import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  @ApiOperation({ summary: "Check API health" })
  @ApiOkResponse({ description: "API health status." })
  @Get()
  check() {
    return {
      status: "ok",
      service: "hr-copilot-api",
      timestamp: new Date().toISOString(),
    };
  }
}
