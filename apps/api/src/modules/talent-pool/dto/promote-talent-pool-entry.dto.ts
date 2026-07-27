import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class PromoteTalentPoolEntryDto {
  @ApiProperty({ description: "Job to create an application for from this pool entry.", example: "cmjob123" })
  @IsString()
  jobId!: string;
}
