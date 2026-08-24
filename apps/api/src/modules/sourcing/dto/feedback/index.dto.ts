import { ApiProperty } from "@nestjs/swagger";
import { SourcingProfileFeedback } from "@prisma/client";
import { IsEnum, ValidateIf } from "class-validator";

export class UpdateSourcingProfileFeedbackDto {
  @ApiProperty({ enum: SourcingProfileFeedback, nullable: true })
  @ValidateIf((_object, value) => value !== null)
  @IsEnum(SourcingProfileFeedback)
  feedback!: SourcingProfileFeedback | null;
}
