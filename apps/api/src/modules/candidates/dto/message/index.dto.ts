import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

export class CreateCandidateMessageDto {
  @ApiProperty({ enum: ["system", "messenger", "zalo", "email", "linkedin"], example: "email" })
  @IsIn(["system", "messenger", "zalo", "email", "linkedin"])
  channel!: string;

  @ApiProperty({ example: "Hi, thanks for applying. Are you available for a short screening call?", maxLength: 4000 })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;
}
