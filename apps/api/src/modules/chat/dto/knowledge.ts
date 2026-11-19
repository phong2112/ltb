import { PartialType } from "@nestjs/swagger";
import { CHAT_KNOWLEDGE_CONTENT_MAX_LENGTH, CHAT_KNOWLEDGE_TITLE_MAX_LENGTH } from "@hr-copilot/shared";
import { ChatKnowledgeCategory } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class CreateChatKnowledgeDto {
  @IsEnum(ChatKnowledgeCategory)
  category!: ChatKnowledgeCategory;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(CHAT_KNOWLEDGE_TITLE_MAX_LENGTH)
  title!: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(CHAT_KNOWLEDGE_CONTENT_MAX_LENGTH)
  content!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;
}

export class UpdateChatKnowledgeDto extends PartialType(CreateChatKnowledgeDto) {}
