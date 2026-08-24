import { PassThrough, Readable } from "node:stream";
import { finished } from "node:stream/promises";
import { BadRequestException } from "@nestjs/common";
import { CvExportService } from "./cv-export.service";
import { CvExportScope } from "@/modules/candidates/dto/export/index.dto";

describe("CvExportService", () => {
  it("streams original CV bytes into a ZIP and records an audit entry", async () => {
    const prisma = {
      application: {
        findMany: jest.fn().mockResolvedValue([{
          candidateId: "candidate-12345678",
          submittedFullName: "Nguyễn Văn A",
          candidate: { fullName: "Nguyễn Văn A" },
          jobId: "job-1",
          job: { title: "Frontend Engineer" },
          files: [{ id: "file-1", path: "cv/path", mimeType: "application/pdf", originalName: "CV Nguyễn Văn A.pdf" }],
        }]),
      },
      talentPoolEntry: { findMany: jest.fn() },
      activityLog: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      job: { findUnique: jest.fn() },
    };
    const storage = { openCandidateCv: jest.fn().mockResolvedValue({ stream: Readable.from(Buffer.from("original-cv")) }) };
    const response = new PassThrough() as PassThrough & { set: jest.Mock; destroy: (error?: Error) => PassThrough };
    response.set = jest.fn();
    const chunks: Buffer[] = [];
    response.on("data", chunk => chunks.push(Buffer.from(chunk)));
    const service = new CvExportService(prisma as never, storage as never);

    await service.export({ scope: CvExportScope.SELECTED, candidateIds: ["candidate-12345678"] }, response as never);
    await finished(response);

    expect(Buffer.concat(chunks).subarray(0, 2).toString()).toBe("PK");
    expect(response.set).toHaveBeenCalledWith(expect.objectContaining({ "Content-Type": "application/zip" }));
    expect(prisma.activityLog.createMany).toHaveBeenCalledWith(expect.objectContaining({ data: [expect.objectContaining({ action: "candidate_file_exported", candidateFileId: "file-1" })] }));
  });

  it("rejects an empty selection before writing a response", async () => {
    const service = new CvExportService({} as never, {} as never);
    await expect(service.export({ scope: CvExportScope.SELECTED }, {} as never)).rejects.toBeInstanceOf(BadRequestException);
  });
});
