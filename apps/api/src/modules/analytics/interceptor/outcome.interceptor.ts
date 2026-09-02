import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { API_ROUTES, apiPath } from "@hr-copilot/shared";
import type { Request, Response } from "express";
import { tap } from "rxjs";
import type { AuthenticatedRequest } from "@/models/auth";
import { AnalyticsService } from "../service";

const API_PATHS = {
  analytics: apiPath(API_ROUTES.analytics.base),
  adminAnalytics: apiPath(API_ROUTES.analytics.admin),
  applications: apiPath(API_ROUTES.applications.base),
  candidates: apiPath(API_ROUTES.candidates.base),
  sourcing: apiPath(API_ROUTES.sourcing.base),
  chat: apiPath(API_ROUTES.chat.base),
  adminChat: apiPath(API_ROUTES.adminChat.base),
  templates: apiPath(API_ROUTES.templates.base),
  jobs: apiPath(API_ROUTES.jobs.base),
  auth: apiPath(API_ROUTES.auth.base),
  cvExports: apiPath(API_ROUTES.candidates.cvExports),
  analysis: apiPath(API_ROUTES.candidates.analysis),
  aiRetry: apiPath(API_ROUTES.candidates.aiRetry),
  messages: apiPath(API_ROUTES.chat.messages),
};

@Injectable()
export class AnalyticsOutcomeInterceptor implements NestInterceptor {
  constructor(private readonly analytics: AnalyticsService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const semantic = semanticRequest(request);
    if (!semantic) return next.handle();
    const startedAt = Date.now();
    let recorded = false;
    const record = (failed: boolean, status: number) => {
      if (recorded) return;
      recorded = true;
      void this.analytics.recordServerEvent({
        eventName: failed ? "feature_action_failed" : "feature_action_completed",
        actorType: request.user ? "admin" : "public",
        actorUserId: request.user?.sub,
        feature: semantic.feature,
        action: semantic.action,
        errorCode: failed ? `api_http_${status}` : undefined,
        httpStatus: status,
        durationMs: Date.now() - startedAt,
        requestId: readHeader(request, "x-request-id"),
      });
    };
    return next.handle().pipe(tap({
      complete: () => record(response.statusCode >= 400, response.statusCode),
      error: (error: unknown) => record(true, statusFromError(error)),
    }));
  }
}

function semanticRequest(request: Request) {
  const path = request.path;
  if (path.startsWith(API_PATHS.analytics) || path.startsWith(API_PATHS.adminAnalytics) || (request.method === "POST" && path === API_PATHS.applications)) return null;
  let feature: string | null = null;
  if (path.includes(API_PATHS.cvExports)) feature = "cv_export";
  else if (path.includes(API_PATHS.analysis) || path.includes(API_PATHS.aiRetry)) feature = "ai_analysis";
  else if (path.startsWith(API_PATHS.candidates)) feature = "candidate_inbox";
  else if (path.startsWith(API_PATHS.sourcing)) feature = "sourcing";
  else if (path.includes(API_PATHS.chat) || path.includes(API_PATHS.adminChat)) feature = "chat";
  else if (path.startsWith(API_PATHS.templates)) feature = "templates";
  else if (path.includes(API_PATHS.jobs)) feature = "jobs";
  else if (path.startsWith(API_PATHS.auth)) feature = "auth";
  if (!feature) return null;
  return { feature, action: actionFor(request.method, path) };
}
function actionFor(method: string, path: string) {
  if (path.includes(API_PATHS.aiRetry)) return "retry_ai";
  if (path.includes(API_PATHS.cvExports)) return "export_cv";
  if (method === "GET") return "view";
  if (method === "POST") return path.endsWith(API_PATHS.messages) ? "send_message" : "create";
  if (method === "DELETE") return "delete";
  return "update";
}
function statusFromError(error: unknown) {
  if (error && typeof error === "object" && "getStatus" in error && typeof error.getStatus === "function") return Number(error.getStatus());
  return 500;
}
function readHeader(request: Request, name: string) { const value = request.headers[name]; return Array.isArray(value) ? value[0] : value; }
