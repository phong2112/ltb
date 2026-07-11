import { ApplicationStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

export class UpdateApplicationStatusDto {
  @IsEnum(ApplicationStatus)
  status!: ApplicationStatus;

  @IsDateString()
  @IsOptional()
  followUpAt?: string;

  @IsString()
  @IsOptional()
  note?: string;
}
