jest.mock("./talent-pool.service", () => ({ TalentPoolService: class {} }));

import { BadRequestException } from "@nestjs/common";
import { TalentPoolController } from "./talent-pool.controller";

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
  it("requeues AI verification for a talent pool entry", async () => {
    const service = { retryAiVerification: jest.fn().mockResolvedValue({ id: "entry-1", status: "PENDING" }) };
    const controller = new TalentPoolController(service as never);

    await expect(controller.retryAiVerification("entry-1")).resolves.toEqual({ id: "entry-1", status: "PENDING" });
    expect(service.retryAiVerification).toHaveBeenCalledWith("entry-1");
  });

});
