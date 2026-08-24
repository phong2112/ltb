import { PartialType } from "@nestjs/swagger";
import { CreateTemplateDto } from "@/modules/templates/dto/create/index.dto";

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {}
