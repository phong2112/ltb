import { BadRequestException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import type { AuthService } from "@/modules/auth/service/index.service";
import type { PrismaService } from "@/modules/prisma/index.service";
import { AnalyticsService } from "./index.service";

function createService() {
  const createMany = jest.fn().mockResolvedValue({ count: 1 });
  const prisma = { productEvent: { createMany } } as unknown as PrismaService;
  const config = { get: jest.fn((key: string) => ({ ANALYTICS_ENABLED: "true", ANALYTICS_HMAC_SECRET: "test-secret", ANALYTICS_RATE_LIMIT_MAX: 100 }[key])) } as unknown as ConfigService;
  const auth = { verifyAccessToken: jest.fn().mockRejectedValue(new Error("invalid")) } as unknown as AuthService;
  return { service: new AnalyticsService(prisma, config, auth), createMany };
}

function request(cookie = "") {
  return { ip: "127.0.0.1", headers: { cookie, "x-request-id": "request-1" }, header: (name: string) => name === "X-Request-Id" ? "request-1" : undefined } as unknown as Request;
}

const baseEvent = {
  eventId: "event-1",
  eventName: "page_viewed" as const,
  occurredAt: new Date().toISOString(),
  anonymousSessionId: "session-1",
  routeTemplate: "/jobs/:id",
  properties: { audience: "public", referrerType: "none" },
};

describe("AnalyticsService ingest", () => {
  it("derives a public actor and stores only the HMAC session", async () => {
    const { service, createMany } = createService();
    await service.ingest([baseEvent], request("access_token=forged"));
    const row = createMany.mock.calls[0][0].data[0];
    expect(row.actorType).toBe("PUBLIC");
    expect(row.actorUserId).toBeNull();
    expect(row.anonymousSessionHash).toMatch(/^[a-f0-9]{64}$/);
    expect(row.anonymousSessionHash).not.toContain("session-1");
  });

  it("rejects properties outside the per-event allowlist", async () => {
    const { service, createMany } = createService();
    await expect(service.ingest([{ ...baseEvent, properties: { email: "candidate@example.com" } }], request())).rejects.toBeInstanceOf(BadRequestException);
    expect(createMany).not.toHaveBeenCalled();
  });

  it("uses createMany skipDuplicates for idempotent batches", async () => {
    const { service, createMany } = createService();
    await service.ingest([baseEvent, { ...baseEvent }], request());
    expect(createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }));
  });
});
