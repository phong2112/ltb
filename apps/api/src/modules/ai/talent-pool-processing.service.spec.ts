import { TalentPoolProcessingService } from "./talent-pool-processing.service";

function createService(options: { aiEnabled?: boolean; existingCandidate?: Record<string, unknown> } = {}) {
  const entry = {
    id: "entry-1",
    candidateId: "candidate-new",
    candidate: {
      id: "candidate-new",
      fullName: "candidate-file",
      email: null,
      normalizedEmail: null,
      phone: null,
      normalizedPhone: null,
      linkedinUrl: null,
      portfolioUrl: null,
    },
    file: { id: "file-1", originalName: "candidate.pdf", mimeType: "application/pdf", path: "cv/file.pdf" },
  };
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(0),
    candidate: {
      findMany: jest.fn().mockResolvedValue(options.existingCandidate ? [options.existingCandidate] : []),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    },
    talentPoolEntry: { update: jest.fn().mockResolvedValue(undefined) },
    activityLog: { updateMany: jest.fn().mockResolvedValue(undefined), create: jest.fn().mockResolvedValue(undefined) },
    application: { create: jest.fn().mockResolvedValue({ id: "application-1" }) },
    candidateFile: { create: jest.fn().mockResolvedValue({ id: "application-file-1" }) },
    cvParseResult: { create: jest.fn().mockResolvedValue(undefined) },
  };
  const prisma = {
    talentPoolEntry: {
      findUnique: jest.fn().mockResolvedValue(entry),
      update: jest.fn().mockResolvedValue(undefined),
    },
    candidateFile: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: "file-1",
        storageTier: "PRIMARY",
        originalName: "candidate.pdf",
        storedName: "cv/file.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
        path: "cv/file.pdf",
      }),
    },
    cvParseResult: { update: jest.fn().mockResolvedValue(undefined) },
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
  const extractor = {
    extract: jest.fn().mockResolvedValue({
      text: "Nguyen Van A\nEmail: a@example.com\nPhone: 0901 234 567",
      parser: "pdf-parse",
    }),
  };
  const jobs = { getAdminJob: jest.fn().mockResolvedValue({ id: "job-1", title: "Developer" }) };
  const config = { get: jest.fn().mockReturnValue(options.aiEnabled ? "groq" : "disabled") };
  const provider = {
    extractProfile: jest.fn().mockResolvedValue({
      fullName: "Nguyen Van A",
      title: "Developer",
      yearsExperience: 3,
      skills: ["TypeScript"],
      languages: ["Vietnamese"],
    }),
  };
  const service = new TalentPoolProcessingService(
    prisma as never,
    extractor as never,
    jobs as never,
    config as never,
    provider as never,
  );
  return { service, prisma, tx, extractor, provider, jobs, entry };
}

describe("TalentPoolProcessingService", () => {
  it("extracts regex contacts without AI and persists them on Candidate", async () => {
    const { service, tx, provider } = createService();

    await service.processPoolEntry("entry-1");

    expect(provider.extractProfile).not.toHaveBeenCalled();
    expect(tx.candidate.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "candidate-new" },
      data: expect.objectContaining({
        email: "a@example.com",
        normalizedEmail: "a@example.com",
        phone: "0901 234 567",
        normalizedPhone: "0901234567",
        fullName: "Nguyen Van A",
      }),
    }));
    expect(tx.talentPoolEntry.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "COMPLETED", candidateId: "candidate-new" }),
    }));
  });

  it("uses AI profile enrichment when enabled", async () => {
    const { service, tx, provider } = createService({ aiEnabled: true });

    await service.processPoolEntry("entry-1");

    expect(provider.extractProfile).toHaveBeenCalledWith(expect.objectContaining({ fileName: "candidate.pdf" }));
    expect(tx.candidate.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ fullName: "Nguyen Van A" }),
    }));
  });

  it("keeps AI extracted names ahead of deterministic text parsing", async () => {
    const { service, tx, provider } = createService({ aiEnabled: true });
    provider.extractProfile.mockResolvedValue({
      fullName: "Nguyen Van AI",
      title: null,
      yearsExperience: null,
      skills: [],
      languages: [],
    });

    await service.processPoolEntry("entry-1");

    expect(tx.candidate.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ fullName: "Nguyen Van AI" }),
    }));
    expect(tx.talentPoolEntry.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        structuredData: expect.objectContaining({
          fullName: "Nguyen Van AI",
          fullNameSource: "ai",
        }),
      }),
    }));
  });

  it("reuses an existing candidate matching extracted contact details", async () => {
    const existingCandidate = {
      id: "candidate-existing",
      fullName: "Nguyen Van A",
      email: "a@example.com",
      normalizedEmail: "a@example.com",
      phone: null,
      normalizedPhone: null,
      linkedinUrl: null,
      portfolioUrl: null,
    };
    const { service, tx } = createService({ existingCandidate });

    await service.processPoolEntry("entry-1");

    expect(tx.talentPoolEntry.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ candidateId: "candidate-existing" }),
    }));
    expect(tx.activityLog.updateMany).toHaveBeenCalled();
    expect(tx.candidate.delete).toHaveBeenCalledWith({ where: { id: "candidate-new" } });
  });

  it("marks the pool entry failed when extraction fails", async () => {
    const { service, prisma, extractor } = createService();
    extractor.extract.mockRejectedValue(new Error("OCR failed"));

    await expect(service.processPoolEntry("entry-1")).rejects.toThrow("OCR failed");

    expect(prisma.talentPoolEntry.update).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "FAILED", errorMessage: "OCR failed" }),
    }));
  });

  it("promotes an entry by copying extracted data and the shared file path", async () => {
    const { service, tx } = createService();
    const entry = {
      id: "entry-1",
      candidateId: "candidate-new",
      candidate: { id: "candidate-new", fullName: "Nguyen Van A", email: "a@example.com", phone: null },
      file: { id: "file-1" },
      extractedText: "CV text",
      structuredData: { email: "a@example.com" },
      promotedApplicationId: null,
      promotedApplication: null,
    };
    const serviceInternals = service as unknown as { prisma: { talentPoolEntry: { findUnique: jest.Mock } } };
    serviceInternals.prisma.talentPoolEntry.findUnique.mockResolvedValue(entry);

    await expect(service.promotePoolEntry("entry-1", "job-1")).resolves.toEqual({
      applicationId: "application-1",
      jobId: "job-1",
    });
    expect(tx.candidateFile.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ applicationId: "application-1", path: "cv/file.pdf" }),
    }));
    expect(tx.cvParseResult.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ extractedText: "CV text", status: "EXTRACTED" }),
    }));
    expect(tx.talentPoolEntry.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { promotedApplicationId: "application-1" },
    }));
  });
});
