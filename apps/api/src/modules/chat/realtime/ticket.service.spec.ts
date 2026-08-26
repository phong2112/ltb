import { UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { ChatRealtimeTicketService } from "./ticket.service";

describe("ChatRealtimeTicketService", () => {
  function createService(ttlSeconds = 60) {
    const config = {
      get: jest.fn((key: string) => key === "CHAT_REALTIME_TICKET_TTL_SECONDS" ? ttlSeconds : undefined),
      getOrThrow: jest.fn(() => "test-realtime-secret-at-least-32-characters"),
    } as unknown as ConfigService;
    return new ChatRealtimeTicketService(config);
  }

  it("round-trips a short-lived guest identity without exposing it as plain JSON", () => {
    const service = createService();
    const result = service.issue("GUEST", "device-1");

    expect(result.ticket).not.toContain("device-1");
    expect(service.verify(result.ticket)).toMatchObject({ role: "GUEST", sub: "device-1", aud: "chat-realtime" });
  });

  it("rejects tampered and expired tickets", () => {
    const service = createService();
    const valid = service.issue("ADMIN", "hr-admin").ticket;
    const expired = createService(-1).issue("ADMIN", "hr-admin").ticket;

    expect(() => service.verify(`${valid}x`)).toThrow(UnauthorizedException);
    expect(() => service.verify(expired)).toThrow(UnauthorizedException);
  });
});
