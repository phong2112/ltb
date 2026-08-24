import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/modules/prisma";
import { CreateTemplateDto } from "@/modules/templates/dto/create/index.dto";
import { UpdateTemplateDto } from "@/modules/templates/dto/update/index.dto";

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  listTemplates() {
    return this.prisma.messageTemplate.findMany({
      orderBy: { createdAt: "asc" },
    });
  }

  createTemplate(dto: CreateTemplateDto) {
    return this.prisma.messageTemplate.create({ data: dto });
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto) {
    await this.ensureTemplateExists(id);

    return this.prisma.messageTemplate.update({
      where: { id },
      data: dto,
    });
  }

  async deleteTemplate(id: string) {
    await this.ensureTemplateExists(id);
    return this.prisma.messageTemplate.delete({ where: { id } });
  }

  private async ensureTemplateExists(id: string) {
    const template = await this.prisma.messageTemplate.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!template) {
      throw new NotFoundException("Không tìm thấy mẫu tin nhắn.");
    }
  }
}
