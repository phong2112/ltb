import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import { ACCESS_TOKEN_SECURITY_NAME, REFRESH_TOKEN_SECURITY_NAME } from "../../config/swagger";
import { AuthService } from "./auth.service";
import { AuthenticatedRequest } from "./auth.types";
import { LoginDto } from "./dto/login.dto";
import { ACCESS_TOKEN_COOKIE_NAME, JwtAuthGuard, readCookie, REFRESH_TOKEN_COOKIE_NAME } from "./jwt-auth.guard";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({ summary: "Log in as the HR admin" })
  @ApiOkResponse({ description: "Returns the admin user and sets access/refresh httpOnly cookies." })
  @ApiUnauthorizedResponse({ description: "Invalid email or password." })
  @Post("login")
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.authService.login(dto.email, dto.password);

    response.cookie(ACCESS_TOKEN_COOKIE_NAME, session.accessToken, {
      httpOnly: true,
      secure: this.shouldUseSecureCookie(),
      sameSite: this.getSameSite(),
      maxAge: session.accessTokenMaxAgeSeconds * 1000,
      path: "/",
    });
    response.cookie(REFRESH_TOKEN_COOKIE_NAME, session.refreshToken, {
      httpOnly: true,
      secure: this.shouldUseSecureCookie(),
      sameSite: this.getSameSite(),
      maxAge: session.refreshTokenMaxAgeSeconds * 1000,
      path: "/",
    });

    return {
      user: session.user,
      expiresIn: session.accessTokenMaxAgeSeconds,
    };
  }

  @ApiOperation({ summary: "Refresh the access token cookie" })
  @ApiCookieAuth(REFRESH_TOKEN_SECURITY_NAME)
  @ApiOkResponse({ description: "Returns the admin user and sets a new access token cookie." })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or expired refresh token." })
  @Post("refresh")
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = readCookie(request, REFRESH_TOKEN_COOKIE_NAME);
    const session = await this.authService.refreshSession(refreshToken);

    response.cookie(ACCESS_TOKEN_COOKIE_NAME, session.accessToken, {
      httpOnly: true,
      secure: this.shouldUseSecureCookie(),
      sameSite: this.getSameSite(),
      maxAge: session.accessTokenMaxAgeSeconds * 1000,
      path: "/",
    });

    return {
      user: session.user,
      expiresIn: session.accessTokenMaxAgeSeconds,
    };
  }

  @ApiOperation({ summary: "Log out and clear auth cookies" })
  @ApiOkResponse({ description: "Auth cookies cleared." })
  @Post("logout")
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(ACCESS_TOKEN_COOKIE_NAME, {
      httpOnly: true,
      secure: this.shouldUseSecureCookie(),
      sameSite: this.getSameSite(),
      path: "/",
    });
    response.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
      httpOnly: true,
      secure: this.shouldUseSecureCookie(),
      sameSite: this.getSameSite(),
      path: "/",
    });

    return { ok: true };
  }

  @ApiOperation({ summary: "Get the current HR admin session" })
  @ApiCookieAuth(ACCESS_TOKEN_SECURITY_NAME)
  @ApiOkResponse({ description: "Current admin user." })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token." })
  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return { user: request.user };
  }

  private shouldUseSecureCookie() {
    const configured = this.configService.get<string>("AUTH_COOKIE_SECURE");
    if (configured) return configured === "true";
    return this.configService.get<string>("NODE_ENV") === "production";
  }

  private getSameSite() {
    const value = this.configService.get<string>("AUTH_COOKIE_SAMESITE");
    if (value === "none" || value === "strict" || value === "lax") return value;
    return this.shouldUseSecureCookie() ? "none" : "lax";
  }
}
