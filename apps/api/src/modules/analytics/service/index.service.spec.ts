import { BadRequestException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import type { AuthService } from "@/modules/auth/service/index.service";
import type { PrismaService } from "@/modules/prisma/index.service";
import { AnalyticsService } from "./index.service";

function createService() {
  const createMany = jest.fn().mockResolvedValue({ count: 1 });
  const eventFindMany = jest.fn().mockResolvedValue([]);
  const aggregateFindMany = jest.fn().mockResolvedValue([]);
  const tx = {
    productEvent: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    productEventDailyAggregate: {
      upsert: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
  const prisma = {
    productEvent: { createMany, findMany: eventFindMany },
    productEventDailyAggregate: { findMany: aggregateFindMany },
    $transaction: jest.fn((operation: (client: typeof tx) => unknown) => operation(tx)),
  } as unknown as PrismaService;
  const config = { get: jest.fn((key: string) => ({ ANALYTICS_ENABLED: "true", ANALYTICS_ADMIN_ENABLED: "true", ANALYTICS_HMAC_SECRET: "test-secret", ANALYTICS_RATE_LIMIT_MAX: 100 }[key])) } as unknown as ConfigService;
  const auth = { verifyAccessToken: jest.fn().mockRejectedValue(new Error("invalid")) } as unknown as AuthService;
  return { service: new AnalyticsService(prisma, config, auth), createMany, eventFindMany, aggregateFindMany, tx };
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

describe("AnalyticsService reports and retention", () => {
  const range = { from: "2026-01-01", to: "2026-01-31" };

  it("includes daily aggregates in overview metrics", async () => {
    const { service, aggregateFindMany } = createService();
    aggregateFindMany.mockResolvedValue([
      {
        date: new Date("2026-01-10T00:00:00.000Z"),
        eventName: "PAGE_VIEWED",
        outcome: "NEUTRAL",
        feature: "",
        action: "",
        errorCode: "",
        funnelStep: "",
        eventCount: 6,
        sessionCount: 3,
      },
      {
        date: new Date("2026-01-10T00:00:00.000Z"),
        eventName: "FEATURE_ACTION_COMPLETED",
        outcome: "SUCCESS",
        feature: "jobs",
        action: "publish",
        errorCode: "",
        funnelStep: "",
        eventCount: 4,
        sessionCount: 2,
      },
      {
        date: new Date("2026-01-11T00:00:00.000Z"),
        eventName: "FEATURE_ACTION_FAILED",
        outcome: "FAILURE",
        feature: "jobs",
        action: "publish",
        errorCode: "publish_failed",
        funnelStep: "",
        eventCount: 1,
        sessionCount: 1,
      },
    ]);

    await expect(service.overview(range)).resolves.toEqual(expect.objectContaining({
      sessions: 3,
      completedActions: 4,
      failedEvents: 1,
      errorRate: 20,
      activeFeatures: 1,
    }));
  });

  it("reads preserved funnel steps from daily aggregates", async () => {
    const { service, aggregateFindMany } = createService();
    aggregateFindMany.mockResolvedValue([
      {
        date: new Date("2026-01-10T00:00:00.000Z"),
        eventName: "APPLICATION_FUNNEL_STEP",
        outcome: "NEUTRAL",
        feature: "application",
        action: "submit",
        errorCode: "",
        funnelStep: "submitted",
        eventCount: 3,
        sessionCount: 2,
      },
    ]);

    const funnel = await service.applicationFunnel(range);
    expect(funnel.find((row) => row.step === "submitted")).toEqual(expect.objectContaining({ count: 3, sessions: 2 }));
  });

  it("preserves the funnel step while aggregating expired events", async () => {
    const { service, eventFindMany, tx } = createService();
    eventFindMany.mockResolvedValue([
      {
        id: "event-1",
        receivedAt: new Date("2025-01-10T12:00:00.000Z"),
        actorType: "PUBLIC",
        eventName: "APPLICATION_FUNNEL_STEP",
        feature: "application",
        action: "submit",
        outcome: "NEUTRAL",
        errorCode: null,
        anonymousSessionHash: "session-hash",
        actorUserId: null,
        properties: { step: "submitted" },
      },
    ]);

    await service.runMaintenance();

    expect(tx.productEventDailyAggregate.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ funnelStep: "submitted", eventCount: 1, sessionCount: 1 }),
    }));
  });

  it("runs retention automatically when the module starts", async () => {
    const { service, eventFindMany } = createService();
    service.onModuleInit();
    await Promise.resolve();
    await Promise.resolve();
    service.onModuleDestroy();
    expect(eventFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.any(Object) }));
  });
});
