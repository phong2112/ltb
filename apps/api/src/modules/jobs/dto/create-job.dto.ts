import { JobStatus } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from "class-validator";

const JOB_EMPLOYMENT_OPTIONS = ["Full-time", "Hybrid", "Remote", "Part-time"] as const;
const JOB_LEVEL_OPTIONS = ["Intern", "Junior", "Mid-level", "Senior", "Manager", "Director"] as const;
const JOB_LOGO_OPTIONS = ["🌸", "🌹", "🌷", "🍑", "💻", "📊", "🎨", "🌿", "⭐", "🦋"] as const;
const TEXT_PATTERN = /^[\p{L}\p{N}\s.,'’()&/+:#-]+$/u;
const LOCATION_PATTERN = /^[\p{L}\p{N}\s.,/()&+-]+$/u;
const TAG_PATTERN = /^[\p{L}\p{N}\s+#./-]+$/u;
const SALARY_PATTERN = /^\d{1,3}(,\d{3})*(\s*-\s*\d{1,3}(,\d{3})*)?\s+(VND|USD)$/i;

function Trim() {
  return Transform(({ value }) => typeof value === "string" ? value.trim() : value);
}

function OptionalTrim() {
  return Transform(({ value }) => {
    if (typeof value !== "string") return value;

    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  });
}

export class CreateJobDto {
  @ApiProperty({ example: "Frontend Developer", minLength: 5, maxLength: 120 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(5, 120)
  @Matches(TEXT_PATTERN, {
    message: "title contains unsupported characters",
  })
  title!: string;

  @ApiProperty({ example: "Bich Candy", minLength: 2, maxLength: 100 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  @Matches(TEXT_PATTERN, {
    message: "company contains unsupported characters",
  })
  company!: string;

  @ApiPropertyOptional({ example: "Engineering", maxLength: 100 })
  @OptionalTrim()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Matches(TEXT_PATTERN, {
    message: "department contains unsupported characters",
  })
  department?: string;

  @ApiProperty({ example: "Ho Chi Minh City", minLength: 2, maxLength: 120 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(2, 120)
  @Matches(LOCATION_PATTERN, {
    message: "location contains unsupported characters",
  })
  location!: string;

  @ApiProperty({ enum: JOB_EMPLOYMENT_OPTIONS, example: "Full-time" })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @IsIn(JOB_EMPLOYMENT_OPTIONS)
  employment!: string;

  @ApiProperty({ enum: JOB_LEVEL_OPTIONS, example: "Mid-level" })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @IsIn(JOB_LEVEL_OPTIONS)
  level!: string;

  @ApiPropertyOptional({ example: "20,000,000 - 30,000,000 VND", maxLength: 40 })
  @OptionalTrim()
  @IsString()
  @IsOptional()
  @MaxLength(40)
  @Matches(SALARY_PATTERN, {
    message: "salaryRange must look like 20,000,000 - 30,000,000 VND or 3,000 USD",
  })
  salaryRange?: string;

  @ApiPropertyOptional({
    example: ["React", "TypeScript"],
    isArray: true,
    maxItems: 12,
    type: String,
  })
  @Transform(({ value }) => {
    if (!Array.isArray(value)) return value;

    const tags = value
      .map((tag) => typeof tag === "string" ? tag.trim() : tag)
      .filter((tag): tag is string => typeof tag === "string" && tag.length > 0);

    return Array.from(new Set(tags));
  })
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @Length(2, 30, { each: true })
  @Matches(TAG_PATTERN, {
    each: true,
    message: "each tag may only contain letters, numbers, spaces, +, #, ., / or -",
  })
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    example: "Build and maintain public career site and HR workspace features.",
    minLength: 80,
    maxLength: 5000,
  })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(80, 5000)
  description!: string;

  @ApiProperty({
    example: "Strong TypeScript experience, solid React fundamentals, and clear communication.",
    minLength: 50,
    maxLength: 4000,
  })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(50, 4000)
  requirements!: string;

  @ApiPropertyOptional({
    example: "Competitive salary, flexible hybrid work, and private health insurance.",
    maxLength: 3000,
  })
  @OptionalTrim()
  @IsString()
  @IsOptional()
  @MaxLength(3000)
  benefits?: string;

  @ApiPropertyOptional({ enum: JobStatus, enumName: "JobStatus", example: JobStatus.DRAFT })
  @IsEnum(JobStatus)
  @IsOptional()
  status?: JobStatus;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  urgent?: boolean;

  @ApiPropertyOptional({ enum: JOB_LOGO_OPTIONS, example: "💻" })
  @OptionalTrim()
  @IsString()
  @IsOptional()
  @IsIn(JOB_LOGO_OPTIONS)
  logo?: string;
}
