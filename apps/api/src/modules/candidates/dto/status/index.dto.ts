import { ApplicationStatus } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

export class UpdateApplicationStatusDto {
  @ApiPropertyOptional({ enum: ApplicationStatus, enumName: "ApplicationStatus", example: ApplicationStatus.REVIEWING })
  @IsEnum(ApplicationStatus)
  @IsOptional()
  status?: ApplicationStatus;

  @ApiPropertyOptional({ example: "2026-07-18T09:00:00.000Z", format: "date-time" })
  @IsDateString()
  @IsOptional()
  followUpAt?: string | null;

  @ApiPropertyOptional({ example: "Candidate looks relevant for the role." })
  @IsString()
  @IsOptional()
  note?: string;
}
