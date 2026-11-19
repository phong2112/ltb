import type { PrismaService } from "@/modules/prisma";
import { CHAT_JOB_LISTING_SUGGESTION } from "../constants";
import { ChatKnowledgeService } from "./knowledge.service";

describe("ChatKnowledgeService.getGuestSuggestions", () => {
  it("offers the job question first, then active FAQ titles in the TA's order", async () => {
    const findMany = jest.fn().mockResolvedValue([
      { title: "Quy trình phỏng vấn tại VSF như thế nào?" },
      { title: "Mức lương cho vị trí đang tuyển là bao nhiêu?" },
    ]);
    const service = new ChatKnowledgeService({ chatKnowledgeEntry: { findMany } } as unknown as PrismaService);

    await expect(service.getGuestSuggestions()).resolves.toEqual({
      questions: [CHAT_JOB_LISTING_SUGGESTION, "Quy trình phỏng vấn tại VSF như thế nào?", "Mức lương cho vị trí đang tuyển là bao nhiêu?"],
    });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }));
  });
});
