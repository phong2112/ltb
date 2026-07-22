import { BadRequestException } from "@nestjs/common";
import type { Request } from "express";
import { createCvUploadOptions } from "./cv-upload.options";

describe("CV upload options", () => {
  it("limits memory uploads before the controller receives the file", () => {
    const options = createCvUploadOptions(8);

    expect(options.limits).toEqual({ fileSize: 8 * 1024 * 1024, files: 1 });
  });

  it("accepts only matching CV extensions and MIME types", () => {
    const fileFilter = createCvUploadOptions(10).fileFilter;
    if (!fileFilter) throw new Error("Expected a CV file filter");

    const acceptCallback = jest.fn();
    fileFilter(
      {} as Request,
      {
        originalname: "candidate.pdf",
        mimetype: "application/pdf",
      } as Express.Multer.File,
      acceptCallback,
    );
    expect(acceptCallback).toHaveBeenCalledWith(null, true);

    const acceptImageCallback = jest.fn();
    fileFilter(
      {} as Request,
      {
        originalname: "scanned-cv.png",
        mimetype: "image/png",
      } as Express.Multer.File,
      acceptImageCallback,
    );
    expect(acceptImageCallback).toHaveBeenCalledWith(null, true);

    const rejectCallback = jest.fn();
    fileFilter(
      {} as Request,
      {
        originalname: "candidate.exe",
        mimetype: "application/pdf",
      } as Express.Multer.File,
      rejectCallback,
    );
    expect(rejectCallback).toHaveBeenCalledWith(
      expect.any(BadRequestException),
      false,
    );
  });
});
