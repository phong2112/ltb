import { Transform } from "class-transformer";
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty()
  jobId!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  linkedinUrl?: string;

  @IsString()
  @IsOptional()
  portfolioUrl?: string;

  @IsString()
  @IsOptional()
  salaryExpectation?: string;

  @IsString()
  @IsOptional()
  noticePeriod?: string;

  @IsString()
  @IsOptional()
  screeningAnswers?: string;

  @Transform(({ value }) => value === true || value === "true" || value === "on")
  @IsBoolean()
  consentAccepted!: boolean;
}
