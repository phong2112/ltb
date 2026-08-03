import { PartialType } from "@nestjs/swagger";
import { CreateJobDto } from "../create/index.dto";

export class UpdateJobDto extends PartialType(CreateJobDto) {}
