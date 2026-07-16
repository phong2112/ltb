import { JobStatus } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import sanitizeHtml, { type IOptions } from "sanitize-html";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateBy,
  ValidateNested,
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

function NormalizeLocations() {
  return Transform(({ value }) => {
    if (!Array.isArray(value)) return value;

    const locations = value
      .map((location) => typeof location === "string" ? location.trim() : location)
      .map((location) => location === "TP. Hồ Chí Minh" ? "TP Hồ Chí Minh" : location)
      .filter((location): location is string => typeof location === "string" && location.length > 0);

    return Array.from(new Set(locations));
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

function getFieldLabel(property?: string) {
  const labels: Record<string, string> = {
    benefits: "Phúc lợi",
    description: "Mô tả công việc",
    requirements: "Yêu cầu công việc",
  };

  return labels[property ?? ""] ?? "Nội dung";
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
      defaultMessage: (args) => `${getFieldLabel(args?.property)} cần có ít nhất ${minimum} ký tự nội dung`,
    },
  }, validationOptions);
}

function MaxMeaningfulLength(maximum: number, validationOptions?: ValidationOptions) {
  return ValidateBy({
    name: "maxMeaningfulLength",
    constraints: [maximum],
    validator: {
      validate: (value: unknown) => typeof value === "string" && meaningfulTextLength(value) <= maximum,
      defaultMessage: (args) => `${getFieldLabel(args?.property)} không được vượt quá ${maximum} ký tự nội dung`,
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
      defaultMessage: () => "Khoảng lương không được vượt quá 1,000,000,000,000",
    },
  }, validationOptions);
}

function NormalizeQuestions() {
  return Transform(({ value }) => {
    if (!Array.isArray(value)) return value;

    return value.map((question, index) => {
      if (!question || typeof question !== "object" || Array.isArray(question)) {
        return question;
      }

      const record = question as Record<string, unknown>;
      const label = typeof record.label === "string" ? record.label.trim() : record.label;

      return Object.assign(new JobQuestionDto(), {
        ...record,
        label,
        required: record.required === true,
        sortOrder: Number.isInteger(record.sortOrder) ? record.sortOrder : index,
      });
    });
  });
}

export class JobQuestionDto {
  @ApiProperty({ example: "How many years of React experience do you have?", minLength: 5, maxLength: 300 })
  @IsString()
  @IsNotEmpty()
  @Length(5, 300)
  label!: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class CreateJobDto {
  @ApiProperty({ example: "Frontend Developer", minLength: 5, maxLength: 120 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(5, 120)
  @Matches(TEXT_PATTERN, {
    message: "Tiêu đề chứa ký tự không được hỗ trợ.",
  })
  title!: string;

  @ApiProperty({ example: "Bich Candy", minLength: 2, maxLength: 100 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  @Matches(TEXT_PATTERN, {
    message: "Công ty chứa ký tự không được hỗ trợ.",
  })
  company!: string;

  @ApiPropertyOptional({ example: "Engineering", maxLength: 100 })
  @OptionalTrim()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Matches(TEXT_PATTERN, {
    message: "Phòng ban chứa ký tự không được hỗ trợ.",
  })
  department?: string;

  @ApiProperty({ enum: JOB_LOCATION_OPTIONS, example: ["Hà Nội", "Remote"], isArray: true, minItems: 1, maxItems: JOB_LOCATION_OPTIONS.length })
  @NormalizeLocations()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(JOB_LOCATION_OPTIONS.length)
  @IsString({ each: true })
  @IsIn(JOB_LOCATION_OPTIONS, { each: true })
  locations!: string[];

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
    message: "Khoảng lương cần có dạng 20,000,000 - 30,000,000 VND hoặc 3,000 USD.",
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
    message: "Mỗi thẻ kỹ năng chỉ được chứa chữ, số, khoảng trắng, +, #, ., / hoặc -.",
  })
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    example: "Build and maintain public career site and TA workspace features.",
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

  @ApiPropertyOptional({
    type: JobQuestionDto,
    isArray: true,
    maxItems: 10,
    example: [
      { label: "How many years of React experience do you have?", required: true, sortOrder: 0 },
      { label: "What is your earliest start date?", required: false, sortOrder: 1 },
    ],
  })
  @NormalizeQuestions()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => JobQuestionDto)
  @IsOptional()
  questions?: JobQuestionDto[];
}
