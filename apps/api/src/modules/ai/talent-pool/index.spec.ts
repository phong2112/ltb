import { TalentPoolProcessingService } from "./index.service";

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
      normalizedLinkedinUrl: null,
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
  };
  const prisma = {
    talentPoolEntry: {
      findUnique: jest.fn().mockResolvedValue(entry),
      update: jest.fn().mockResolvedValue(undefined),
    },
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
  const extractor = {
    extract: jest.fn().mockResolvedValue({
      text: "Nguyen Van A\nEmail: a@example.com\nPhone: 0901 234 567",
      parser: "pdf-parse",
    }),
  };
  const config = { get: jest.fn().mockReturnValue(options.aiEnabled ? "groq" : "disabled") };
  const provider = {
    extractProfile: jest.fn().mockResolvedValue({
      fullName: "Nguyen Van A",
      title: "Developer",
      yearsExperience: 3,
      skills: ["TypeScript"],
      languages: ["Vietnamese"],
    }),
    summarizeCv: jest.fn().mockResolvedValue({
      overview: "Developer có kinh nghiệm TypeScript.",
      currentTitle: "Developer",
      totalExperience: "3 năm",
      keySkills: ["TypeScript"],
      workCompanies: ["FPT Software"],
      workHighlights: ["Làm Developer tại FPT Software."],
      education: [],
      languages: ["Vietnamese"],
      notesForTa: ["Có email a@example.com trong CV."],
    }),
  };
  const service = new TalentPoolProcessingService(
    prisma as never,
    extractor as never,
    config as never,
    provider as never,
  );
  return { service, prisma, tx, extractor, provider, entry };
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
    expect(provider.summarizeCv).toHaveBeenCalledWith(expect.objectContaining({
      cvText: expect.not.stringContaining("a@example.com"),
    }));
    expect(tx.candidate.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ fullName: "Nguyen Van A" }),
    }));
    expect(tx.talentPoolEntry.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        structuredData: expect.objectContaining({
          cvSummary: expect.objectContaining({
            overview: "Developer có kinh nghiệm TypeScript.",
            workCompanies: ["FPT Software"],
            notesForTa: ["Có email [email đã ẩn] trong CV."],
          }),
        }),
      }),
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
      normalizedLinkedinUrl: null,
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
});
