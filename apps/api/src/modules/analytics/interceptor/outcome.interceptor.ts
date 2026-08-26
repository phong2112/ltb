import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import type { Request, Response } from "express";
import { tap } from "rxjs";
import type { AuthenticatedRequest } from "@/models/auth";
import { AnalyticsService } from "../service";

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
  if (path.startsWith("/analytics") || path.startsWith("/admin/analytics") || (request.method === "POST" && path === "/applications")) return null;
  let feature: string | null = null;
  if (path.includes("/cv-exports")) feature = "cv_export";
  else if (path.includes("/analysis") || path.includes("/ai/retry")) feature = "ai_analysis";
  else if (path.startsWith("/admin/candidates")) feature = "candidate_inbox";
  else if (path.startsWith("/admin/sourcing")) feature = "sourcing";
  else if (path.includes("/chat")) feature = "chat";
  else if (path.startsWith("/admin/templates")) feature = "templates";
  else if (path.includes("/jobs")) feature = "jobs";
  else if (path.startsWith("/auth")) feature = "auth";
  if (!feature) return null;
  return { feature, action: actionFor(request.method, path) };
}
function actionFor(method: string, path: string) {
  if (path.includes("/ai/retry")) return "retry_ai";
  if (path.includes("/cv-exports")) return "export_cv";
  if (method === "GET") return "view";
  if (method === "POST") return path.endsWith("/messages") ? "send_message" : "create";
  if (method === "DELETE") return "delete";
  return "update";
}
function statusFromError(error: unknown) {
  if (error && typeof error === "object" && "getStatus" in error && typeof error.getStatus === "function") return Number(error.getStatus());
  return 500;
}
function readHeader(request: Request, name: string) { const value = request.headers[name]; return Array.isArray(value) ? value[0] : value; }
