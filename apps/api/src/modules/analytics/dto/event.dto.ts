import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from "class-validator";
import { ANALYTICS_FEATURES, PRODUCT_EVENT_NAMES } from "@hr-copilot/shared";

export class ProductEventDto {
  @IsString() @MaxLength(80) eventId!: string;
  @IsOptional() @IsInt() @IsIn([1]) schemaVersion?: number;
  @IsIn(PRODUCT_EVENT_NAMES) eventName!: (typeof PRODUCT_EVENT_NAMES)[number];
  @IsDateString() occurredAt!: string;
  @IsOptional() @IsString() @MaxLength(128) anonymousSessionId?: string;
  @IsOptional() @IsIn(ANALYTICS_FEATURES) feature?: (typeof ANALYTICS_FEATURES)[number];
  @IsOptional() @IsString() @MaxLength(80) action?: string;
  @IsOptional() @IsString() @MaxLength(80) surface?: string;
  @IsOptional() @IsString() @MaxLength(160) routeTemplate?: string;
  @IsOptional() @IsString() @MaxLength(80) errorCode?: string;
  @IsOptional() @IsInt() @Min(100) @Max(599) httpStatus?: number;
  @IsOptional() @IsInt() @Min(0) @Max(300_000) durationMs?: number;
  @IsOptional() @IsString() @MaxLength(80) requestId?: string;
  @IsOptional() @IsString() @MaxLength(80) release?: string;
  @IsOptional() @IsObject() properties?: Record<string, unknown>;
}

export class ProductEventBatchDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20)
  @ValidateNested({ each: true }) @Type(() => ProductEventDto)
  events!: ProductEventDto[];
}
