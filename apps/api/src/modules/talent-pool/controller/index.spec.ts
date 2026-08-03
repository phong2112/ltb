jest.mock("../service/index.service", () => ({ TalentPoolService: class {} }));

import { BadRequestException } from "@nestjs/common";
import { TalentPoolController } from "./index.controller";

describe("TalentPoolController", () => {
  it("passes the authenticated TA identity to per-file upload handling", async () => {
    const service = {
      uploadMany: jest.fn().mockResolvedValue([
        { fileName: "bad.pdf", status: "error", reason: "invalid signature" },
        { fileName: "good.pdf", status: "created", entryId: "entry-1" },
      ]),
    };
    const controller = new TalentPoolController(service as never);
    const files = [{ originalname: "bad.pdf" }, { originalname: "good.pdf" }] as Express.Multer.File[];
    const user = { sub: "legacy-session", email: "ta@example.com", name: "TA" };

    await expect(controller.upload(
      files,
      { targetJobId: "job-1" },
      { user } as never,
    )).resolves.toEqual({ results: expect.any(Array) });
    expect(service.uploadMany).toHaveBeenCalledWith(files, {
      targetJobId: "job-1",
      uploadedBy: user,
    });
  });

  it("rejects requests without files", async () => {
    const controller = new TalentPoolController({ uploadMany: jest.fn() } as never);

    await expect(controller.upload(undefined, {}, { user: undefined } as never))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
