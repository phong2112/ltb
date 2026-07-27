import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString } from "class-validator";

export class UpdateTalentPoolEntryDto {
  @ApiPropertyOptional({ example: "Nguyễn Văn A" })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ example: "a.nguyen@gmail.com" })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: "0901234567" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: "Senior Frontend Engineer" })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ type: [String], example: ["React", "TypeScript"] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @ApiPropertyOptional({ type: [String], example: ["frontend", "senior"] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ example: "Strong portfolio, follow up next week." })
  @IsString()
  @IsOptional()
  notes?: string;
}
