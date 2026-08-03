import { PartialType } from "@nestjs/swagger";
import { CreateTemplateDto } from "../create/index.dto";

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {}
