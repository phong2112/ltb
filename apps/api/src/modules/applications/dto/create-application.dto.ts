import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";

export const APPLICATION_AREAS = ["Hà Nội", "Đà Nẵng", "Hải Phòng", "Quảng Ninh", "TP Hồ Chí Minh", "Remote"] as const;

export class CreateApplicationDto {
  @ApiProperty({ example: "cmjob123" })
  @IsString()
  @IsNotEmpty()
  jobId!: string;

  @ApiProperty({ example: "Nguyen Van A" })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ example: "candidate@example.com", format: "email" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "0901234567" })
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @Matches(/^(?=(?:\D*\d){8,15}\D*$)\+?[\d\s().-]+$/)
  phone!: string;

  @ApiProperty({ example: "Hà Nội", enum: APPLICATION_AREAS })
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @IsIn(APPLICATION_AREAS)
  applicationArea!: string;

  @ApiPropertyOptional({ example: "https://www.linkedin.com/in/candidate" })
  @IsString()
  @IsOptional()
  linkedinUrl?: string;

  @ApiPropertyOptional({ example: "https://candidate.dev" })
  @IsString()
  @IsOptional()
  portfolioUrl?: string;

  @ApiPropertyOptional({ example: "25,000,000 VND" })
  @IsString()
  @IsOptional()
  salaryExpectation?: string;

  @ApiPropertyOptional({ example: "30 days" })
  @IsString()
  @IsOptional()
  noticePeriod?: string;

  @ApiPropertyOptional({ example: "I have 4 years of React and TypeScript experience." })
  @IsString()
  @IsOptional()
  screeningAnswers?: string;

  @ApiProperty({ example: true })
  @Transform(({ value }) => value === true || value === "true" || value === "on")
  @IsBoolean()
  consentAccepted!: boolean;
}
