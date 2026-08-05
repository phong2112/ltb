import { ApiProperty } from "@nestjs/swagger";
import { SourcingProfileStatus } from "@prisma/client";
import { IsEnum } from "class-validator";

export class UpdateSourcingProfileStatusDto {
  @ApiProperty({ enum: SourcingProfileStatus })
  @IsEnum(SourcingProfileStatus)
  status!: SourcingProfileStatus;
}
