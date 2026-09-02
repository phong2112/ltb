import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, NotFoundException, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  Prisma, ProductEventActorType, ProductEventCategory, ProductEventName as DbEventName,
  ProductEventOutcome, ProductEventSource,
} from "@prisma/client";
import { createHmac, randomUUID } from "node:crypto";
import type { Request } from "express";
import {
  APPLICATION_FUNNEL_STEPS, type AnalyticsActorType, type AnalyticsFeatureRow,
  type AnalyticsFunnelRow, type AnalyticsIssueRow, type AnalyticsOverview,
  type AnalyticsRecentEvent, type ProductEventName,
} from "@hr-copilot/shared";
import { AuthService } from "@/modules/auth/service/index.service";
import { ACCESS_TOKEN_COOKIE_NAME, readCookie } from "@/modules/auth/guards/index.guard";
import { PrismaService } from "@/modules/prisma/index.service";
import type { ProductEventDto } from "../dto";

const EVENT_NAME: Record<ProductEventName, DbEventName> = {
  page_viewed: DbEventName.PAGE_VIEWED,
  feature_action_started: DbEventName.FEATURE_ACTION_STARTED,
  feature_action_completed: DbEventName.FEATURE_ACTION_COMPLETED,
  feature_action_failed: DbEventName.FEATURE_ACTION_FAILED,
  form_validation_failed: DbEventName.FORM_VALIDATION_FAILED,
  client_error_occurred: DbEventName.CLIENT_ERROR_OCCURRED,
  application_funnel_step: DbEventName.APPLICATION_FUNNEL_STEP,
  search_performed: DbEventName.SEARCH_PERFORMED,
};
const API_EVENT_NAME = Object.fromEntries(Object.entries(EVENT_NAME).map(([key, value]) => [value, key])) as Record<DbEventName, ProductEventName>;
const PROPERTY_ALLOWLIST: Record<ProductEventName, readonly string[]> = {
  page_viewed: ["audience", "referrerType"],
  feature_action_started: ["durationBucket", "entityType"],
  feature_action_completed: ["durationBucket", "entityType"],
  feature_action_failed: ["durationBucket", "entityType"],
  form_validation_failed: ["formId", "fieldCodes", "errorCodes"],
  client_error_occurred: [],
  application_funnel_step: ["step"],
  search_performed: ["filterKeys", "hasQuery"],
};
const SAFE_CODE = /^[a-z0-9][a-z0-9_.:-]{0,79}$/i;

type ReportQuery = Record<string, string | undefined>;
type ReportRange = { from: Date; to: Date; actorType?: ProductEventActorType; feature?: string };
type RawReportEvent = {
  eventName: DbEventName;
  outcome: ProductEventOutcome;
  feature: string | null;
  action: string | null;
  errorCode: string | null;
  anonymousSessionHash: string | null;
  actorUserId: string | null;
  properties: Prisma.JsonValue;
  occurredAt: Date;
};
type AggregateReportRow = {
  date: Date;
  eventName: DbEventName;
  outcome: ProductEventOutcome;
  feature: string;
  action: string;
  errorCode: string;
  funnelStep: string;
  eventCount: number;
  sessionCount: number;
};

const DAY_MS = 86_400_000;
const AGGREGATE_RETENTION_DAYS = 365;

@Injectable()
export class AnalyticsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly rateWindows = new Map<string, { startedAt: number; count: number }>();
  private maintenanceTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly auth: AuthService,
  ) {}

  onModuleInit() {
    if (!this.isEnabled()) return;
    void this.runScheduledMaintenance();
    this.maintenanceTimer = setInterval(() => void this.runScheduledMaintenance(), DAY_MS);
    this.maintenanceTimer.unref();
  }

  onModuleDestroy() {
    if (this.maintenanceTimer) clearInterval(this.maintenanceTimer);
  }

  async ingest(events: ProductEventDto[], request: Request) {
    if (!this.isEnabled()) return;
    this.enforceRateLimit(request);
    const actor = await this.resolveActor(request);
    const tenantSlug = this.safeHeader(request.headers["x-tenant-slug"], 64);
    const requestId = this.safeHeader(request.headers["x-request-id"], 80);
    const now = Date.now();

    const rows = events.map((event) => {
      this.validateEvent(event, now);
      return {
        eventId: event.eventId,
        schemaVersion: 1,
        eventName: EVENT_NAME[event.eventName],
        category: this.categoryFor(event.eventName),
        source: ProductEventSource.WEB,
        actorType: actor.userId ? ProductEventActorType.ADMIN : ProductEventActorType.PUBLIC,
        outcome: this.outcomeFor(event.eventName),
        actorUserId: actor.userId,
        anonymousSessionHash: !actor.userId && event.anonymousSessionId ? this.hashSession(event.anonymousSessionId) : null,
        tenantSlug,
        feature: event.feature ?? null,
        action: event.action ?? null,
        surface: event.surface ?? null,
        routeTemplate: event.routeTemplate ?? null,
        errorCode: event.errorCode ?? null,
        httpStatus: event.httpStatus ?? null,
        durationMs: event.durationMs ?? null,
        requestId: event.requestId ?? requestId,
        release: event.release ?? null,
        properties: event.properties as Prisma.InputJsonValue | undefined,
        occurredAt: new Date(event.occurredAt),
      };
    });

    await this.prisma.productEvent.createMany({ data: rows, skipDuplicates: true }).catch((error: unknown) => {
      this.logger.warn(error instanceof Error ? `analytics_ingest_failed:${error.name}` : "analytics_ingest_failed");
    });
  }

  async recordServerEvent(input: {
    eventName: "feature_action_completed" | "feature_action_failed" | "application_funnel_step";
    actorType: AnalyticsActorType; actorUserId?: string; feature?: string; action?: string;
    errorCode?: string; httpStatus?: number; durationMs?: number; requestId?: string;
    properties?: Record<string, unknown>;
  }) {
    if (!this.isEnabled()) return;
    const name = EVENT_NAME[input.eventName];
    await this.prisma.productEvent.create({ data: {
      eventId: input.requestId ? `server:${input.requestId}:${input.eventName}` : randomUUID(),
      eventName: name,
      category: this.categoryFor(input.eventName),
      source: ProductEventSource.API,
      actorType: input.actorType === "admin" ? ProductEventActorType.ADMIN : ProductEventActorType.PUBLIC,
      outcome: this.outcomeFor(input.eventName),
      actorUserId: input.actorUserId,
      feature: input.feature,
      action: input.action,
      errorCode: input.errorCode,
      httpStatus: input.httpStatus,
      durationMs: input.durationMs,
      requestId: input.requestId,
      properties: input.properties as Prisma.InputJsonValue | undefined,
      occurredAt: new Date(),
    }}).catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
      this.logger.warn(error instanceof Error ? `analytics_server_event_failed:${error.name}` : "analytics_server_event_failed");
    });
  }

  async overview(query: ReportQuery): Promise<AnalyticsOverview> {
    this.assertAdminEnabled();
    const range = this.parseRange(query);
    const [events, aggregates] = await this.readReportData(range);
    const completed = countEvents(events, aggregates, (event) => event.eventName === DbEventName.FEATURE_ACTION_COMPLETED);
    const failed = countEvents(events, aggregates, (event) => event.outcome === ProductEventOutcome.FAILURE);
    const outcomes = countEvents(events, aggregates, (event) => event.outcome !== ProductEventOutcome.NEUTRAL);
    const features = new Set<string>();
    for (const event of events) if (event.feature) features.add(event.feature);
    for (const aggregate of aggregates) if (aggregate.feature) features.add(aggregate.feature);
    return {
      from: range.from.toISOString(), to: range.to.toISOString(),
      sessions: combinedSessionCount(events, aggregates), completedActions: completed, failedEvents: failed,
      errorRate: outcomes ? roundPercent(failed, outcomes) : 0,
      activeFeatures: features.size,
    };
  }

  async features(query: ReportQuery): Promise<AnalyticsFeatureRow[]> {
    this.assertAdminEnabled();
    const range = this.parseRange(query);
    const periodMs = range.to.getTime() - range.from.getTime();
    const previous = { ...range, from: new Date(range.from.getTime() - periodMs), to: new Date(range.from) };
    const [[currentEvents, currentAggregates], [previousEvents, previousAggregates]] = await Promise.all([
      this.readReportData(range),
      this.readReportData(previous),
    ]);
    const current = summarizeCompletedFeatures(currentEvents, currentAggregates);
    const prior = summarizeCompletedFeatures(previousEvents, previousAggregates);
    const features = new Set(current.keys());
    return [...features].map((feature) => {
      const row = current.get(feature) ?? { count: 0, sessions: 0 };
      const previousCompletedActions = prior.get(feature)?.count ?? 0;
      return {
        feature, completedActions: row.count, sessions: row.sessions, previousCompletedActions,
        trendPercent: previousCompletedActions ? Math.round(((row.count - previousCompletedActions) / previousCompletedActions) * 100) : null,
      };
    }).sort((a, b) => b.completedActions - a.completedActions);
  }

  async issues(query: ReportQuery): Promise<AnalyticsIssueRow[]> {
    this.assertAdminEnabled();
    const [events, aggregates] = await this.readReportData(this.parseRange(query));
    const groups = groupIssues(events, aggregates);
    return [...groups.entries()].map(([key, group]) => {
      const [errorCode, feature, action] = key.split("|");
      return { errorCode, feature, action, count: group.count, sessions: group.sessions.size + group.aggregateSessions, lastOccurredAt: group.latest.toISOString() };
    }).sort((a, b) => b.count - a.count).slice(0, 50);
  }

  async applicationFunnel(query: ReportQuery): Promise<AnalyticsFunnelRow[]> {
    this.assertAdminEnabled();
    const [events, aggregates] = await this.readReportData(this.parseRange(query));
    const rows = events.filter((event) => event.eventName === DbEventName.APPLICATION_FUNNEL_STEP);
    let previous = 0;
    return APPLICATION_FUNNEL_STEPS.map((step) => {
      const stepRows = rows.filter((row) => isRecord(row.properties) && row.properties.step === step);
      const aggregateRows = aggregates.filter((row) => row.eventName === DbEventName.APPLICATION_FUNNEL_STEP && row.funnelStep === step);
      const count = stepRows.length + sum(aggregateRows, (row) => row.eventCount);
      const sessions = uniqueSessions(stepRows) + sum(aggregateRows, (row) => row.sessionCount);
      const result = { step, count, sessions, conversionFromPrevious: previous ? roundPercent(count, previous) : null };
      previous = count;
      return result;
    });
  }

  async recentEvents(query: ReportQuery): Promise<AnalyticsRecentEvent[]> {
    this.assertAdminEnabled();
    const range = this.parseRange(query);
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100);
    const rows = await this.prisma.productEvent.findMany({ where: this.whereFor(range), orderBy: { occurredAt: "desc" }, take: limit });
    return rows.map((row) => ({
      id: row.id, eventName: API_EVENT_NAME[row.eventName], actorType: row.actorType === ProductEventActorType.ADMIN ? "admin" : "public",
      feature: row.feature, action: row.action, outcome: row.outcome.toLowerCase() as AnalyticsRecentEvent["outcome"], errorCode: row.errorCode, occurredAt: row.occurredAt.toISOString(),
    }));
  }

  async runMaintenance() {
    this.assertAdminEnabled();
    return this.performMaintenance();
  }

  private async performMaintenance() {
    const retentionDays = this.config.get<number>("ANALYTICS_RAW_RETENTION_DAYS") ?? 90;
    const cutoff = startOfDay(new Date(Date.now() - retentionDays * DAY_MS).toISOString());
    const expired = await this.prisma.productEvent.findMany({
      where: { receivedAt: { lt: cutoff } },
      select: { id: true, receivedAt: true, actorType: true, eventName: true, feature: true, action: true, outcome: true, errorCode: true, anonymousSessionHash: true, actorUserId: true, properties: true },
    });
    const groups = new Map<string, { date: Date; actorType: ProductEventActorType; eventName: DbEventName; feature: string; action: string; outcome: ProductEventOutcome; errorCode: string; funnelStep: string; count: number; sessions: Set<string> }>();
    for (const event of expired) {
      const date = startOfDay(event.receivedAt.toISOString());
      const feature = event.feature ?? "";
      const action = event.eventName === DbEventName.FEATURE_ACTION_COMPLETED || event.eventName === DbEventName.APPLICATION_FUNNEL_STEP
        ? ""
        : event.action ?? "";
      const errorCode = event.errorCode ?? "";
      const funnelStep = event.eventName === DbEventName.APPLICATION_FUNNEL_STEP && isRecord(event.properties) && typeof event.properties.step === "string"
        ? event.properties.step
        : "";
      const key = [date.toISOString(), event.actorType, event.eventName, feature, action, event.outcome, errorCode, funnelStep].join("|");
      const group = groups.get(key) ?? { date, actorType: event.actorType, eventName: event.eventName, feature, action, outcome: event.outcome, errorCode, funnelStep, count: 0, sessions: new Set<string>() };
      group.count += 1;
      if (event.anonymousSessionHash) group.sessions.add(`public:${event.anonymousSessionHash}`);
      if (event.actorUserId) group.sessions.add(`admin:${event.actorUserId}`);
      groups.set(key, group);
    }
    await this.prisma.$transaction(async (tx) => {
      for (const group of groups.values()) {
        const key = { date: group.date, actorType: group.actorType, eventName: group.eventName, feature: group.feature, action: group.action, outcome: group.outcome, errorCode: group.errorCode, funnelStep: group.funnelStep };
        await tx.productEventDailyAggregate.upsert({
          where: { date_actorType_eventName_feature_action_outcome_errorCode_funnelStep: key },
          create: { ...key, eventCount: group.count, sessionCount: group.sessions.size },
          update: { eventCount: group.count, sessionCount: group.sessions.size },
        });
      }
      if (expired.length) await tx.productEvent.deleteMany({ where: { id: { in: expired.map((event) => event.id) } } });
      await tx.productEventDailyAggregate.deleteMany({ where: { date: { lt: startOfDay(new Date(Date.now() - AGGREGATE_RETENTION_DAYS * DAY_MS).toISOString()) } } });
    });
    return { aggregatedGroups: groups.size, deletedRawEvents: expired.length, cutoff: cutoff.toISOString() };
  }

  private async runScheduledMaintenance() {
    try {
      const result = await this.performMaintenance();
      this.logger.log(`analytics_maintenance_completed:${result.deletedRawEvents}`);
    } catch (error) {
      this.logger.error(error instanceof Error ? `analytics_maintenance_failed:${error.message}` : "analytics_maintenance_failed");
    }
  }

  private readReportData(range: ReportRange) {
    return Promise.all([this.readReportEvents(range), this.readReportAggregates(range)]);
  }

  private async readReportEvents(range: ReportRange) {
    return this.prisma.productEvent.findMany({
      where: this.whereFor(range),
      select: { eventName: true, outcome: true, feature: true, action: true, errorCode: true, anonymousSessionHash: true, actorUserId: true, properties: true, occurredAt: true },
    });
  }

  private async readReportAggregates(range: ReportRange) {
    return this.prisma.productEventDailyAggregate.findMany({
      where: {
        date: { gte: range.from, lt: range.to },
        actorType: range.actorType,
        feature: range.feature,
      },
      select: {
        date: true,
        eventName: true,
        outcome: true,
        feature: true,
        action: true,
        errorCode: true,
        funnelStep: true,
        eventCount: true,
        sessionCount: true,
      },
    });
  }

  private whereFor(range: ReportRange): Prisma.ProductEventWhereInput {
    return { receivedAt: { gte: range.from, lt: range.to }, actorType: range.actorType, feature: range.feature };
  }

  private parseRange(query: ReportQuery): ReportRange {
    const to = query.to ? endExclusive(query.to) : new Date();
    const from = query.from ? startOfDay(query.from) : new Date(to.getTime() - 30 * 86_400_000);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from >= to) throw new BadRequestException("Khoảng thời gian analytics không hợp lệ.");
    if (to.getTime() - from.getTime() > AGGREGATE_RETENTION_DAYS * DAY_MS + 1_000) throw new BadRequestException("Khoảng thời gian analytics tối đa là 365 ngày.");
    let actorType: ProductEventActorType | undefined;
    if (query.actorType) {
      if (!['public', 'admin'].includes(query.actorType)) throw new BadRequestException("Nhóm người dùng không hợp lệ.");
      actorType = query.actorType === "admin" ? ProductEventActorType.ADMIN : ProductEventActorType.PUBLIC;
    }
    if (query.feature && !SAFE_CODE.test(query.feature)) throw new BadRequestException("Feature không hợp lệ.");
    return { from, to, actorType, feature: query.feature || undefined };
  }

  private validateEvent(event: ProductEventDto, now: number) {
    const occurredAt = new Date(event.occurredAt).getTime();
    if (occurredAt > now + 86_400_000 || occurredAt < now - 7 * 86_400_000) throw new BadRequestException("Thời điểm event nằm ngoài cửa sổ cho phép.");
    for (const value of [event.eventId, event.action, event.surface, event.errorCode, event.requestId, event.release].filter(Boolean) as string[]) {
      if (!SAFE_CODE.test(value)) throw new BadRequestException("Event chứa mã không hợp lệ.");
    }
    if (event.routeTemplate && (event.routeTemplate.includes("?") || !event.routeTemplate.startsWith("/"))) throw new BadRequestException("Route template không hợp lệ.");
    const properties = event.properties ?? {};
    const allowed = PROPERTY_ALLOWLIST[event.eventName];
    if (Object.keys(properties).some((key) => !allowed.includes(key))) throw new BadRequestException("Event chứa thuộc tính không được phép.");
    if (JSON.stringify(properties).length > 2_000) throw new BadRequestException("Thuộc tính event vượt quá giới hạn.");
    for (const [key, value] of Object.entries(properties)) {
      if (Array.isArray(value) && (value.length > 20 || value.some((item) => typeof item !== "string" || !SAFE_CODE.test(item)))) throw new BadRequestException(`Thuộc tính ${key} không hợp lệ.`);
      if (typeof value === "string" && (!SAFE_CODE.test(value) || value.length > 80)) throw new BadRequestException(`Thuộc tính ${key} không hợp lệ.`);
      if (!["string", "boolean"].includes(typeof value) && !Array.isArray(value)) throw new BadRequestException(`Thuộc tính ${key} không hợp lệ.`);
    }
    if (event.eventName === "application_funnel_step" && !APPLICATION_FUNNEL_STEPS.includes(properties.step as never)) throw new BadRequestException("Funnel step không hợp lệ.");
  }

  private async resolveActor(request: Request) {
    const token = readCookie(request, ACCESS_TOKEN_COOKIE_NAME);
    if (!token) return { userId: null };
    return this.auth.verifyAccessToken(token).then((user) => ({ userId: user.sub })).catch(() => ({ userId: null }));
  }

  private enforceRateLimit(request: Request) {
    const key = request.ip || "unknown";
    const now = Date.now();
    const windowMs = (this.config.get<number>("ANALYTICS_RATE_LIMIT_WINDOW_SECONDS") ?? 60) * 1_000;
    const max = this.config.get<number>("ANALYTICS_RATE_LIMIT_MAX") ?? 120;
    const entry = this.rateWindows.get(key);
    if (!entry || now - entry.startedAt >= windowMs) { this.rateWindows.set(key, { startedAt: now, count: 1 }); return; }
    entry.count += 1;
    if (entry.count > max) throw new HttpException("Analytics rate limit exceeded.", HttpStatus.TOO_MANY_REQUESTS);
  }

  private hashSession(value: string) {
    const secret = this.config.get<string>("ANALYTICS_HMAC_SECRET");
    if (!secret) throw new BadRequestException("Analytics session processing is unavailable.");
    return createHmac("sha256", secret).update(value).digest("hex");
  }

  private categoryFor(name: ProductEventName) {
    if (name === "page_viewed") return ProductEventCategory.NAVIGATION;
    if (name === "form_validation_failed") return ProductEventCategory.VALIDATION;
    if (name === "client_error_occurred") return ProductEventCategory.ERROR;
    if (name === "application_funnel_step") return ProductEventCategory.FUNNEL;
    if (name === "search_performed") return ProductEventCategory.SEARCH;
    return ProductEventCategory.FEATURE;
  }

  private outcomeFor(name: ProductEventName) {
    if (["feature_action_failed", "form_validation_failed", "client_error_occurred"].includes(name)) return ProductEventOutcome.FAILURE;
    if (name === "feature_action_completed") return ProductEventOutcome.SUCCESS;
    return ProductEventOutcome.NEUTRAL;
  }

  private safeHeader(value: string | string[] | undefined, max: number) {
    const normalized = Array.isArray(value) ? value[0] : value;
    return normalized && SAFE_CODE.test(normalized) && normalized.length <= max ? normalized : null;
  }

  private isEnabled() { return this.config.get<string>("ANALYTICS_ENABLED") === "true"; }
  private assertAdminEnabled() { if (this.config.get<string>("ANALYTICS_ADMIN_ENABLED") !== "true") throw new NotFoundException("Analytics dashboard is disabled."); }
}

function uniqueSessions(events: Array<{ anonymousSessionHash: string | null; actorUserId: string | null }>) {
  return new Set(events.flatMap((event) => event.anonymousSessionHash ? [`public:${event.anonymousSessionHash}`] : event.actorUserId ? [`admin:${event.actorUserId}`] : [])).size;
}
function combinedSessionCount(events: RawReportEvent[], aggregates: AggregateReportRow[]) {
  const pageViews = events.filter((event) => event.eventName === DbEventName.PAGE_VIEWED);
  const aggregatePageViews = aggregates.filter((event) => event.eventName === DbEventName.PAGE_VIEWED);
  return uniqueSessions(pageViews) + sum(aggregatePageViews, (row) => row.sessionCount);
}
function countEvents(
  events: RawReportEvent[],
  aggregates: AggregateReportRow[],
  predicate: (event: Pick<RawReportEvent, "eventName" | "outcome">) => boolean,
) {
  return events.filter(predicate).length + sum(aggregates.filter(predicate), (row) => row.eventCount);
}
function summarizeCompletedFeatures(events: RawReportEvent[], aggregates: AggregateReportRow[]) {
  const result = new Map<string, { count: number; sessions: number }>();
  const rawByFeature = new Map<string, RawReportEvent[]>();
  for (const event of events) {
    if (event.eventName !== DbEventName.FEATURE_ACTION_COMPLETED || !event.feature) continue;
    rawByFeature.set(event.feature, [...(rawByFeature.get(event.feature) ?? []), event]);
  }
  for (const [feature, rows] of rawByFeature) {
    result.set(feature, { count: rows.length, sessions: uniqueSessions(rows) });
  }
  for (const aggregate of aggregates) {
    if (aggregate.eventName !== DbEventName.FEATURE_ACTION_COMPLETED || !aggregate.feature) continue;
    const current = result.get(aggregate.feature) ?? { count: 0, sessions: 0 };
    current.count += aggregate.eventCount;
    current.sessions += aggregate.sessionCount;
    result.set(aggregate.feature, current);
  }
  return result;
}
function groupIssues(events: RawReportEvent[], aggregates: AggregateReportRow[]) {
  const groups = new Map<string, { count: number; sessions: Set<string>; aggregateSessions: number; latest: Date }>();
  for (const event of events) {
    if (event.outcome !== ProductEventOutcome.FAILURE) continue;
    const key = issueKey(event.errorCode, event.feature, event.action);
    const group = groups.get(key) ?? { count: 0, sessions: new Set<string>(), aggregateSessions: 0, latest: event.occurredAt };
    group.count += 1;
    if (event.anonymousSessionHash) group.sessions.add(`public:${event.anonymousSessionHash}`);
    if (event.actorUserId) group.sessions.add(`admin:${event.actorUserId}`);
    if (event.occurredAt > group.latest) group.latest = event.occurredAt;
    groups.set(key, group);
  }
  for (const aggregate of aggregates) {
    if (aggregate.outcome !== ProductEventOutcome.FAILURE) continue;
    const key = issueKey(aggregate.errorCode, aggregate.feature, aggregate.action);
    const group = groups.get(key) ?? { count: 0, sessions: new Set<string>(), aggregateSessions: 0, latest: aggregate.date };
    group.count += aggregate.eventCount;
    group.aggregateSessions += aggregate.sessionCount;
    if (aggregate.date > group.latest) group.latest = aggregate.date;
    groups.set(key, group);
  }
  return groups;
}
function issueKey(errorCode: string | null, feature: string | null, action: string | null) {
  return `${errorCode || "unknown"}|${feature || "unknown"}|${action || "unknown"}`;
}
function sum<T>(rows: T[], value: (row: T) => number) {
  return rows.reduce((total, row) => total + value(row), 0);
}
function roundPercent(value: number, total: number) { return Math.round((value / total) * 10_000) / 100; }
function startOfDay(value: string) { return new Date(`${value.slice(0, 10)}T00:00:00.000Z`); }
function endExclusive(value: string) { const date = startOfDay(value); date.setUTCDate(date.getUTCDate() + 1); return date; }
function isRecord(value: Prisma.JsonValue): value is Prisma.JsonObject { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
