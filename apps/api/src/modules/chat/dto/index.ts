import { ChatConversationStatus } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from "class-validator";

export class RestoreGuestSessionDto {
  @IsString()
  @MinLength(20)
  recoveryToken!: string;
}

export class SendChatMessageDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: "Nội dung tin nhắn không được để trống." })
  @MaxLength(2000)
  content!: string;

  @IsUUID()
  clientMessageId!: string;
}

export class UpdateChatStatusDto {
  @IsEnum(ChatConversationStatus)
  status!: ChatConversationStatus;
}

export class AdminChatQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsString()
  cursor?: string;
}

export class ChatMessagesQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;
}
