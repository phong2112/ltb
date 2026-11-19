import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "@/modules/prisma";
import type { CreateChatKnowledgeDto, UpdateChatKnowledgeDto } from "../dto/knowledge";

const KNOWLEDGE_ORDER: Prisma.ChatKnowledgeEntryOrderByWithRelationInput[] = [
  { category: "asc" },
  { sortOrder: "asc" },
  { createdAt: "asc" },
];

@Injectable()
export class ChatKnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  listAll() {
    return this.prisma.chatKnowledgeEntry.findMany({ orderBy: KNOWLEDGE_ORDER });
  }

  listActive() {
    return this.prisma.chatKnowledgeEntry.findMany({
      where: { isActive: true },
      orderBy: KNOWLEDGE_ORDER,
      select: { category: true, title: true, content: true },
    });
  }

  create(dto: CreateChatKnowledgeDto) {
    return this.prisma.chatKnowledgeEntry.create({ data: dto });
  }

  async update(id: string, dto: UpdateChatKnowledgeDto) {
    await this.requireEntry(id);
    return this.prisma.chatKnowledgeEntry.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.requireEntry(id);
    await this.prisma.chatKnowledgeEntry.delete({ where: { id } });
    return { id };
  }

  private async requireEntry(id: string) {
    const entry = await this.prisma.chatKnowledgeEntry.findUnique({ where: { id }, select: { id: true } });
    if (!entry) throw new NotFoundException("Không tìm thấy mục kiến thức.");
    return entry;
  }
}
