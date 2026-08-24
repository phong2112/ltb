import { Transform, Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsEnum, IsOptional, IsString, ValidateIf, ValidateNested } from "class-validator";
import { ApplicationStatus } from "@prisma/client";

export enum CvExportScope {
  JOB = "job",
  CANDIDATE = "candidate",
  SELECTED = "selected",
  FILTERED = "filtered",
}

export class CvExportFiltersDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === "string" ? value.trim().toUpperCase() : value)
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @IsOptional()
  @IsString()
  jobId?: string;
}

export class CreateCvExportDto {
  @IsEnum(CvExportScope)
  scope!: CvExportScope;

  @ValidateIf(value => value.scope === CvExportScope.JOB)
  @IsString()
  jobId?: string;

  @ValidateIf(value => value.scope === CvExportScope.CANDIDATE)
  @IsString()
  candidateId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CvExportFiltersDto)
  filters?: CvExportFiltersDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  candidateIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  talentPoolEntryIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  excludedCandidateIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  excludedTalentPoolEntryIds?: string[];
}
