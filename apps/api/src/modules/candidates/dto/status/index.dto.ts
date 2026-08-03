import { ApplicationStatus } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

export class UpdateApplicationStatusDto {
  @ApiPropertyOptional({ enum: ApplicationStatus, enumName: "ApplicationStatus", example: ApplicationStatus.VIEWED })
  @Transform(({ value }) => normalizeApplicationStatusInput(value))
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

const LEGACY_APPLICATION_STATUS_MAP: Record<string, ApplicationStatus> = {
  REVIEWING: ApplicationStatus.VIEWED,
  SCREENING: ApplicationStatus.VIEWED,
};

export function normalizeApplicationStatusInput(value: unknown) {
  if (typeof value !== "string") return value;

  const normalized = value.trim().toUpperCase();
  const apiStatus = normalized.replace(/-/g, "_");
  const legacyStatus = LEGACY_APPLICATION_STATUS_MAP[apiStatus];
  if (legacyStatus) return legacyStatus;

  return apiStatus;
}
