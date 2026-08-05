import { ApiProperty } from "@nestjs/swagger";
import { SourcingSource } from "@prisma/client";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsString, MaxLength } from "class-validator";

const IMPORTABLE_SOURCES = [
  SourcingSource.LINKEDIN,
  SourcingSource.GITHUB,
  SourcingSource.PUBLIC_WEB,
  SourcingSource.FACEBOOK,
  SourcingSource.ITVIEC,
  SourcingSource.VIETNAMWORKS,
  SourcingSource.GITLAB,
  SourcingSource.STACK_OVERFLOW,
  SourcingSource.MANUAL,
  SourcingSource.REFERRAL,
] as const;

export class ImportSourcingProfilesDto {
  @ApiProperty({
    enum: IMPORTABLE_SOURCES,
    example: SourcingSource.LINKEDIN,
  })
  @IsIn(IMPORTABLE_SOURCES)
  source!: (typeof IMPORTABLE_SOURCES)[number];

  @ApiProperty({
    type: [String],
    example: ["https://www.linkedin.com/in/example-profile"],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  urls!: string[];
}
