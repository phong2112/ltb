import { ApiProperty } from "@nestjs/swagger";
import { SourcingCampaignStatus } from "@prisma/client";
import { IsEnum } from "class-validator";

export class UpdateSourcingCampaignStatusDto {
  @ApiProperty({ enum: SourcingCampaignStatus })
  @IsEnum(SourcingCampaignStatus)
  status!: SourcingCampaignStatus;
}
