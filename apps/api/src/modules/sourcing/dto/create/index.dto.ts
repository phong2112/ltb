import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

const DISCOVERY_LOCATION_SCOPES = ["VIETNAM", "GLOBAL"] as const;

export type SourcingDiscoveryLocationScopeInput = typeof DISCOVERY_LOCATION_SCOPES[number];

export class CreateSourcingCampaignDto {
  @ApiProperty({ example: "cmjob123" })
  @IsString()
  @IsNotEmpty()
  jobId!: string;

  @ApiPropertyOptional({ example: "LinkedIn · AI Engineer HCM" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    enum: DISCOVERY_LOCATION_SCOPES,
    default: "VIETNAM",
    description: "Controls automatic LinkedIn discovery location targeting.",
  })
  @IsOptional()
  @IsIn(DISCOVERY_LOCATION_SCOPES)
  discoveryLocationScope?: SourcingDiscoveryLocationScopeInput;
}
