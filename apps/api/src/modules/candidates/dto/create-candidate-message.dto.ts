import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

export class CreateCandidateMessageDto {
  @IsIn(["system", "messenger", "zalo", "email", "linkedin"])
  channel!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;
}
