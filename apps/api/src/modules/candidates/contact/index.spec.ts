import { lockCandidateContacts, normalizeEmail, normalizePhone } from ".";

describe("candidate contact utilities", () => {
  it("normalizes email and Vietnamese phone formats", () => {
    expect(normalizeEmail("  Candidate@Example.COM ")).toBe("candidate@example.com");
    expect(normalizePhone("+84 901-234-567")).toBe("0901234567");
  });

  it("locks every available contact in stable order", async () => {
    const tx = { $executeRaw: jest.fn().mockResolvedValue(0) };

    await lockCandidateContacts(tx as never, "a@example.com", "0901234567");

    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
  });

  it("supports phone-only talent-pool profiles", async () => {
    const tx = { $executeRaw: jest.fn().mockResolvedValue(0) };

    await lockCandidateContacts(tx as never, undefined, "0901234567");

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
  });
});
