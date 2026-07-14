import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from "class-validator";

const APPLICATION_AREAS = ["Hà Nội", "Đà Nẵng", "Hải Phòng", "Quảng Ninh", "TP Hồ Chí Minh", "Remote"] as const;

function ParseJsonArray() {
  return Transform(({ value }) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value !== "string") return value;

    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  });
}

function TrimOptionalString() {
  return Transform(({ value }) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed || undefined;
  });
}

export class ApplicationQuestionAnswerDto {
  @ApiProperty({ example: "cmquestion123" })
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @ApiPropertyOptional({ example: "I have 4 years of React and TypeScript experience.", maxLength: 1000 })
  @TrimOptionalString()
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  answer?: string;
}

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

  @ApiPropertyOptional({
    type: ApplicationQuestionAnswerDto,
    isArray: true,
    maxItems: 10,
    description: "JSON string when submitted as multipart/form-data.",
  })
  @ParseJsonArray()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ApplicationQuestionAnswerDto)
  @IsOptional()
  questionAnswers?: ApplicationQuestionAnswerDto[];

  @ApiProperty({ example: true })
  @Transform(({ value }) => value === true || value === "true" || value === "on")
  @IsBoolean()
  consentAccepted!: boolean;
}
