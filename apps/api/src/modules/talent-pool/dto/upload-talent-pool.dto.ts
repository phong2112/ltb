import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UploadTalentPoolDto {
  @ApiPropertyOptional({
    description: "Optional job to auto-assign each uploaded CV to after extraction.",
    example: "cmjob123",
  })
  @IsString()
  @IsOptional()
  targetJobId?: string;
}
