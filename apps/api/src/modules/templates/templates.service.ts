import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  listTemplates() {
    return this.prisma.messageTemplate.findMany({
      orderBy: { createdAt: "asc" },
    });
  }
}
