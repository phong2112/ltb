import { JobStatus } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import sanitizeHtml, { type IOptions } from "sanitize-html";
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
  ValidateBy,
  type ValidationOptions,
} from "class-validator";

const JOB_EMPLOYMENT_OPTIONS = ["Full-time", "Hybrid", "Remote", "Part-time"] as const;
const JOB_LEVEL_OPTIONS = ["Intern", "Junior", "Mid-level", "Senior", "Manager", "Director"] as const;
const JOB_LOCATION_OPTIONS = ["Hà Nội", "Đà Nẵng", "Hải Phòng", "Quảng Ninh", "TP Hồ Chí Minh", "Remote"] as const;
const JOB_LOGO_OPTIONS = ["🌸", "🌹", "🌷", "🍑", "💻", "📊", "🎨", "🌿", "⭐", "🦋"] as const;
const TEXT_PATTERN = /^[\p{L}\p{N}\s.,'’()&/+:#-]+$/u;
const TAG_PATTERN = /^[\p{L}\p{N}\s+#./-]+$/u;
const SALARY_PATTERN = /^\d{1,3}(,\d{3})*(\s*-\s*\d{1,3}(,\d{3})*)?\s+(VND|USD)$/i;
const MAX_SALARY_VALUE = 1_000_000_000_000n;
const RICH_TEXT_OPTIONS: IOptions = {
  allowedTags: ["p", "br", "strong", "em", "u", "s", "h2", "h3", "ul", "ol", "li", "a", "blockquote"],
  allowedAttributes: { a: ["href", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
};

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

function NullableTrim() {
  return Transform(({ value }) => {
    if (value === null) return null;
    if (typeof value !== "string") return value;

    const trimmed = value.trim();
    return trimmed || null;
  });
}

function richTextToPlainText(value: string) {
  const htmlWithSpacing = value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(?:p|h2|h3|li|blockquote)>/gi, " ");
  return sanitizeHtml(htmlWithSpacing, { allowedTags: [], allowedAttributes: {} });
}

function meaningfulTextLength(value: string) {
  return richTextToPlainText(value).trim().replace(/\s+/gu, " ").length;
}

function SanitizeRichText(optional = false) {
  return Transform(({ value }) => {
    if (typeof value !== "string") return value;

    const sanitized = sanitizeHtml(value.trim(), RICH_TEXT_OPTIONS);
    if (optional && meaningfulTextLength(sanitized) === 0) return null;
    return sanitized;
  });
}

function MinMeaningfulLength(minimum: number, validationOptions?: ValidationOptions) {
  return ValidateBy({
    name: "minMeaningfulLength",
    constraints: [minimum],
    validator: {
      validate: (value: unknown) => typeof value === "string" && meaningfulTextLength(value) >= minimum,
      defaultMessage: (args) => `${args?.property ?? "value"} must contain at least ${minimum} meaningful characters`,
    },
  }, validationOptions);
}

function MaxMeaningfulLength(maximum: number, validationOptions?: ValidationOptions) {
  return ValidateBy({
    name: "maxMeaningfulLength",
    constraints: [maximum],
    validator: {
      validate: (value: unknown) => typeof value === "string" && meaningfulTextLength(value) <= maximum,
      defaultMessage: (args) => `${args?.property ?? "value"} must contain at most ${maximum} meaningful characters`,
    },
  }, validationOptions);
}

function MaxSalaryValue(validationOptions?: ValidationOptions) {
  return ValidateBy({
    name: "maxSalaryValue",
    validator: {
      validate: (value: unknown) => {
        if (typeof value !== "string" || !SALARY_PATTERN.test(value)) return false;

        const range = value.replace(/\s+(VND|USD)$/i, "");
        return range.split("-").every(part => {
          const digits = part.replace(/\D/g, "");
          return digits.length > 0 && BigInt(digits) <= MAX_SALARY_VALUE;
        });
      },
      defaultMessage: () => "salaryRange values must not exceed 1,000,000,000,000",
    },
  }, validationOptions);
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

  @ApiProperty({ enum: JOB_LOCATION_OPTIONS, example: "TP Hồ Chí Minh" })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @IsIn(JOB_LOCATION_OPTIONS)
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

  @ApiPropertyOptional({ example: "20,000,000 - 30,000,000 VND", maxLength: 40, nullable: true })
  @NullableTrim()
  @IsString()
  @IsOptional()
  @MaxLength(40)
  @Matches(SALARY_PATTERN, {
    message: "salaryRange must look like 20,000,000 - 30,000,000 VND or 3,000 USD",
  })
  @MaxSalaryValue()
  salaryRange?: string | null;

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
  @SanitizeRichText()
  @IsString()
  @IsNotEmpty()
  @MinMeaningfulLength(80)
  @MaxMeaningfulLength(5000)
  description!: string;

  @ApiProperty({
    example: "Strong TypeScript experience, solid React fundamentals, and clear communication.",
    minLength: 50,
    maxLength: 4000,
  })
  @SanitizeRichText()
  @IsString()
  @IsNotEmpty()
  @MinMeaningfulLength(50)
  @MaxMeaningfulLength(4000)
  requirements!: string;

  @ApiPropertyOptional({
    example: "Competitive salary, flexible hybrid work, and private health insurance.",
    maxLength: 3000,
  })
  @SanitizeRichText(true)
  @IsString()
  @IsOptional()
  @MaxMeaningfulLength(3000)
  benefits?: string | null;

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
