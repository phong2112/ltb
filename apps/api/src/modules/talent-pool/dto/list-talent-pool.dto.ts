import { ApiPropertyOptional } from "@nestjs/swagger";
import { CvParseStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ListTalentPoolDto {
  @ApiPropertyOptional({ description: "Search by candidate name, email, or phone." })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: CvParseStatus, enumName: "CvParseStatus" })
  @IsEnum(CvParseStatus)
  @IsOptional()
  status?: CvParseStatus;

  @ApiPropertyOptional({ description: "Filter by a single tag." })
  @IsString()
  @IsOptional()
  tag?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number;
}
