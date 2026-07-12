import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

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

  @ApiPropertyOptional({ example: "0901234567" })
  @IsString()
  @IsOptional()
  phone?: string;

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
