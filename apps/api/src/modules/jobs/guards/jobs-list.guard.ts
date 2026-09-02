import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { API_ROUTES } from "@hr-copilot/shared";
import { ACCESS_TOKEN_COOKIE_NAME, readCookie } from "@/modules/auth/guards/index.guard";
import { AuthService } from "@/modules/auth/service/index.service";
import type { AuthenticatedRequest } from "@/models/auth";

/** Requires authentication only when the caller explicitly requests the admin job list. */
@Injectable()
export class JobsListGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.query.scope !== API_ROUTES.jobs.adminScope) return true;

    const token = readCookie(request, ACCESS_TOKEN_COOKIE_NAME);
    if (!token) throw new UnauthorizedException("Thiếu phiên đăng nhập.");

    request.user = await this.authService.verifyAccessToken(token);
    return true;
  }
}
