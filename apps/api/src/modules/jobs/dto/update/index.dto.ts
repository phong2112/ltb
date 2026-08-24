import { PartialType } from "@nestjs/swagger";
import { CreateJobDto } from "@/modules/jobs/dto/create/index.dto";

export class UpdateJobDto extends PartialType(CreateJobDto) {}
