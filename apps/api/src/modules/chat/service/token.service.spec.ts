import { ChatTokenService } from "./token.service";

describe("ChatTokenService", () => {
  const service = new ChatTokenService();

  it("creates independent high-entropy tokens and stores a stable hash", () => {
    const first = service.generate();
    const second = service.generate();

    expect(first).not.toEqual(second);
    expect(first.length).toBeGreaterThanOrEqual(40);
    expect(service.hash(first)).toHaveLength(64);
    expect(service.hash(first)).toEqual(service.hash(first));
    expect(service.hash(first)).not.toContain(first);
  });

  it("calculates expiry in days", () => {
    const before = Date.now() + 2 * 86400_000;
    const expiry = service.expiresInDays(2).getTime();
    const after = Date.now() + 2 * 86400_000;

    expect(expiry).toBeGreaterThanOrEqual(before);
    expect(expiry).toBeLessThanOrEqual(after);
  });
});

