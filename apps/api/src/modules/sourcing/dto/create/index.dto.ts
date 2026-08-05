import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

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
}
