import { JobStatus } from "@prisma/client";
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
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(5, 120)
  @Matches(TEXT_PATTERN, {
    message: "title contains unsupported characters",
  })
  title!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  @Matches(TEXT_PATTERN, {
    message: "company contains unsupported characters",
  })
  company!: string;

  @OptionalTrim()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Matches(TEXT_PATTERN, {
    message: "department contains unsupported characters",
  })
  department?: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(2, 120)
  @Matches(LOCATION_PATTERN, {
    message: "location contains unsupported characters",
  })
  location!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @IsIn(JOB_EMPLOYMENT_OPTIONS)
  employment!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @IsIn(JOB_LEVEL_OPTIONS)
  level!: string;

  @OptionalTrim()
  @IsString()
  @IsOptional()
  @MaxLength(40)
  @Matches(SALARY_PATTERN, {
    message: "salaryRange must look like 20,000,000 - 30,000,000 VND or 3,000 USD",
  })
  salaryRange?: string;

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

  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(80, 5000)
  description!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(50, 4000)
  requirements!: string;

  @OptionalTrim()
  @IsString()
  @IsOptional()
  @MaxLength(3000)
  benefits?: string;

  @IsEnum(JobStatus)
  @IsOptional()
  status?: JobStatus;

  @IsBoolean()
  @IsOptional()
  urgent?: boolean;

  @OptionalTrim()
  @IsString()
  @IsOptional()
  @IsIn(JOB_LOGO_OPTIONS)
  logo?: string;
}
