import type { PrismaService } from "../prisma/prisma.service";
import type { CvStorageService } from "../files/cv-storage.service";
import { CandidatesService } from "./candidates.service";

describe("CandidatesService", () => {
  it("does not overwrite application status when only the HR note changes", async () => {
    const application = {
      id: "application-1",
      candidateId: "candidate-1",
      jobId: "job-1",
      submittedFullName: "Candidate",
      job: { title: "Frontend Engineer" },
    };
    const applicationUpdate = jest
      .fn()
      .mockResolvedValue({ ...application, hrNotes: "Strong profile" });
    const activityCreate = jest.fn().mockResolvedValue({});
    const transactionClient = {
      application: { update: applicationUpdate },
      followUpTask: { upsert: jest.fn(), deleteMany: jest.fn() },
      activityLog: { create: activityCreate },
    };
    const prisma = {
      application: { findUnique: jest.fn().mockResolvedValue(application) },
      $transaction: jest.fn(
        (callback: (tx: typeof transactionClient) => unknown) =>
          callback(transactionClient),
      ),
    };
    const service = new CandidatesService(
      prisma as unknown as PrismaService,
      {} as CvStorageService,
    );

    await service.updateApplication("application-1", {
      note: " Strong profile ",
    });

    expect(applicationUpdate).toHaveBeenCalledWith({
      where: { id: "application-1" },
      data: { status: undefined, hrNotes: "Strong profile" },
    });
    expect(activityCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "application_details_updated",
          metadata: expect.objectContaining({ noteUpdated: true }),
        }),
      }),
    );
  });
});
