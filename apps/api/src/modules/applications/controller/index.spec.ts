jest.mock("../service/index.service", () => ({
  ApplicationsService: class ApplicationsService {},
}));

import { BadRequestException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { ApplicationsController } from "./index.controller";
import type { ApplicationCvPreviewService } from "@/modules/applications/cv-preview/index.service";
import type { ApplicationsService } from "@/modules/applications/service/index.service";
import type { CreateApplicationDto } from "@/modules/applications/dto/create/index.dto";

describe("ApplicationsController CV signature validation", () => {
  const dto: CreateApplicationDto = {
    jobId: "job-1",
    fullName: "Candidate",
    email: "candidate@example.com",
    phone: "0901234567",
    applicationArea: "Hà Nội",
    consentAccepted: true,
  };

  function createController() {
    const applicationsService = {
      createApplication: jest.fn().mockResolvedValue({ applicationId: "application-1" }),
    };
    const configService = {
      get: jest.fn().mockReturnValue(10),
    };

    return {
      controller: new ApplicationsController(
        applicationsService as unknown as ApplicationsService,
        {} as ApplicationCvPreviewService,
        configService as unknown as ConfigService,
      ),
      applicationsService,
    };
  }

  it("accepts a PDF with leading PDF whitespace before its header", async () => {
    const { controller, applicationsService } = createController();
    const file = createPdfFile(Buffer.from("\n%PDF-1.7\n%%EOF", "ascii"));

    await expect(controller.createApplication(dto, file)).resolves.toEqual({
      applicationId: "application-1",
    });
    expect(applicationsService.createApplication).toHaveBeenCalledWith(dto, file);
  });

  it("rejects arbitrary non-whitespace bytes before a PDF header", async () => {
    const { controller, applicationsService } = createController();
    const file = createPdfFile(Buffer.from("MZ%PDF-1.7\n%%EOF", "ascii"));

    await expect(controller.createApplication(dto, file)).rejects.toBeInstanceOf(BadRequestException);
    expect(applicationsService.createApplication).not.toHaveBeenCalled();
  });
});

function createPdfFile(buffer: Buffer) {
  return {
    originalname: "candidate.pdf",
    mimetype: "application/pdf",
    size: buffer.length,
    buffer,
  } as Express.Multer.File;
}
