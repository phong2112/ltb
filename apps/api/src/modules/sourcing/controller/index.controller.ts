import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ACCESS_TOKEN_SECURITY_NAME } from "../../../utils/swagger";
import { JwtAuthGuard } from "../../auth/guards/index.guard";
import { CreateSourcingCampaignDto } from "../dto/create/index.dto";
import { ImportSourcingProfilesDto } from "../dto/import-linkedin/index.dto";
import { UpdateSourcingProfileStatusDto } from "../dto/status/index.dto";
import { SourcingService } from "../service/index.service";

@ApiTags("Sourcing")
@ApiCookieAuth(ACCESS_TOKEN_SECURITY_NAME)
@UseGuards(JwtAuthGuard)
@Controller("admin/sourcing")
export class SourcingController {
  constructor(private readonly sourcingService: SourcingService) {}

  @ApiOkResponse({ description: "Sourcing campaigns ordered by newest first." })
  @Get()
  listCampaigns() {
    return this.sourcingService.listCampaigns();
  }

  @ApiCreatedResponse({ description: "Campaign with a multi-source, LinkedIn-priority sourcing brief." })
  @Post()
  createCampaign(@Body() dto: CreateSourcingCampaignDto) {
    return this.sourcingService.createCampaign(dto);
  }

  @ApiOkResponse({ description: "Sourcing campaign detail and sourced profiles." })
  @Get(":id")
  getCampaign(@Param("id") id: string) {
    return this.sourcingService.getCampaign(id);
  }

  @ApiCreatedResponse({ description: "Discovered LinkedIn public profiles through the configured search API." })
  @Post(":id/discover/linkedin")
  discoverLinkedinProfiles(@Param("id") id: string) {
    return this.sourcingService.discoverLinkedinProfiles(id);
  }

  @ApiCreatedResponse({ description: "Ran the resilient retrieval-first sourcing orchestration workflow." })
  @Post(":id/run")
  runOrchestration(@Param("id") id: string) {
    return this.sourcingService.runOrchestration(id);
  }

  @ApiCreatedResponse({ description: "Suggested existing candidates and talent pool entries that may match the JD." })
  @Post(":id/suggest/internal")
  suggestInternalCandidates(@Param("id") id: string) {
    return this.sourcingService.suggestInternalCandidates(id);
  }

  @ApiCreatedResponse({ description: "Imported and deduplicated profile URLs by source." })
  @Post(":id/profiles")
  importProfiles(@Param("id") id: string, @Body() dto: ImportSourcingProfilesDto) {
    return this.sourcingService.importProfiles(id, dto);
  }

  @ApiOkResponse({ description: "Updated sourced profile funnel status." })
  @Patch(":id/profiles/:profileId/status")
  updateProfileStatus(
    @Param("id") id: string,
    @Param("profileId") profileId: string,
    @Body() dto: UpdateSourcingProfileStatusDto,
  ) {
    return this.sourcingService.updateProfileStatus(id, profileId, dto.status);
  }
}
