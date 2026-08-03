import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "v.bichlt6@vinsmartfuture.tech", format: "email" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "demo123", minLength: 1 })
  @IsString()
  @MinLength(1)
  password!: string;
}
