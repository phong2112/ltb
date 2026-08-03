import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

const MESSAGE_TEMPLATE_CHANNELS = ["Zalo", "Messenger", "LinkedIn", "Email"] as const;

function Trim() {
  return Transform(({ value }) => typeof value === "string" ? value.trim() : value);
}

export class CreateTemplateDto {
  @ApiProperty({ example: "Mời phỏng vấn", minLength: 2, maxLength: 100 })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: MESSAGE_TEMPLATE_CHANNELS, example: "Zalo" })
  @Trim()
  @IsIn(MESSAGE_TEMPLATE_CHANNELS)
  channel!: string;

  @ApiProperty({ example: "Chào [Tên ứng viên], ...", minLength: 1, maxLength: 4000 })
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;
}
