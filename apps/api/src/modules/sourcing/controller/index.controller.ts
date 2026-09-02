import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { API_ROUTES } from "@hr-copilot/shared";
import { ApiAcceptedResponse, ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ACCESS_TOKEN_SECURITY_NAME } from "@/utils/swagger";
import { JwtAuthGuard } from "@/modules/auth/guards/index.guard";
import { CreateSourcingCampaignDto } from "@/modules/sourcing/dto/create/index.dto";
import { ImportSourcingProfilesDto } from "@/modules/sourcing/dto/import-linkedin/index.dto";
import { UpdateSourcingProfileStatusDto } from "@/modules/sourcing/dto/status/index.dto";
import { UpdateSourcingCampaignStatusDto } from "@/modules/sourcing/dto/campaign-status/index.dto";
import { UpdateSourcingProfileFeedbackDto } from "@/modules/sourcing/dto/feedback/index.dto";
import { SourcingService } from "@/modules/sourcing/service/index.service";

@ApiTags("Sourcing")
@ApiCookieAuth(ACCESS_TOKEN_SECURITY_NAME)
@UseGuards(JwtAuthGuard)
@Controller(API_ROUTES.sourcing.base)
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
  @Get(API_ROUTES.sourcing.id)
  getCampaign(@Param("id") id: string) {
    return this.sourcingService.getCampaign(id);
  }

  @ApiOkResponse({ description: "Updated sourcing campaign lifecycle status." })
  @Patch(`${API_ROUTES.sourcing.id}/${API_ROUTES.sourcing.status}`)
  updateCampaignStatus(@Param("id") id: string, @Body() dto: UpdateSourcingCampaignStatusDto) {
    return this.sourcingService.updateCampaignStatus(id, dto.status);
  }

  @ApiCreatedResponse({ description: "Discovered LinkedIn public profiles through the configured search API." })
  @Post(`${API_ROUTES.sourcing.id}/${API_ROUTES.sourcing.discoverLinkedin}`)
  discoverLinkedinProfiles(@Param("id") id: string) {
    return this.sourcingService.discoverLinkedinProfiles(id);
  }

  @ApiAcceptedResponse({ description: "Queued the resilient retrieval-first sourcing orchestration workflow." })
  @HttpCode(HttpStatus.ACCEPTED)
  @Post(`${API_ROUTES.sourcing.id}/${API_ROUTES.sourcing.run}`)
  runOrchestration(@Param("id") id: string) {
    return this.sourcingService.queueOrchestration(id);
  }

  @ApiCreatedResponse({ description: "Suggested existing candidates and talent pool entries that may match the JD." })
  @Post(`${API_ROUTES.sourcing.id}/${API_ROUTES.sourcing.suggestInternal}`)
  suggestInternalCandidates(@Param("id") id: string) {
    return this.sourcingService.suggestInternalCandidates(id);
  }

  @ApiCreatedResponse({ description: "Imported and deduplicated profile URLs by source." })
  @Post(`${API_ROUTES.sourcing.id}/${API_ROUTES.sourcing.profiles}`)
  importProfiles(@Param("id") id: string, @Body() dto: ImportSourcingProfilesDto) {
    return this.sourcingService.importProfiles(id, dto);
  }

  @ApiOkResponse({ description: "Updated sourced profile funnel status." })
  @Patch(`${API_ROUTES.sourcing.id}/${API_ROUTES.sourcing.profiles}/${API_ROUTES.sourcing.profileId}/${API_ROUTES.sourcing.status}`)
  updateProfileStatus(
    @Param("id") id: string,
    @Param("profileId") profileId: string,
    @Body() dto: UpdateSourcingProfileStatusDto,
  ) {
    return this.sourcingService.updateProfileStatus(id, profileId, dto.status);
  }


  @ApiOkResponse({ description: "Recorded TA relevance feedback used to evaluate sourcing ranking." })
  @Patch(`${API_ROUTES.sourcing.id}/${API_ROUTES.sourcing.profiles}/${API_ROUTES.sourcing.profileId}/${API_ROUTES.sourcing.feedback}`)
  updateProfileFeedback(
    @Param("id") id: string,
    @Param("profileId") profileId: string,
    @Body() dto: UpdateSourcingProfileFeedbackDto,
  ) {
    return this.sourcingService.updateProfileFeedback(id, profileId, dto.feedback);
  }
}
