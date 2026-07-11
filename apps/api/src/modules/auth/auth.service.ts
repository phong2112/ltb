import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuthUser } from "./auth.types";

const DEFAULT_ADMIN_EMAIL = "v.bichlt6@vinsmartfuture.tech";
const DEFAULT_ADMIN_PASSWORD = "demo123";

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const adminEmail = (this.configService.get<string>("ADMIN_EMAIL") ?? DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
    const adminPassword = this.configService.get<string>("ADMIN_PASSWORD") ?? DEFAULT_ADMIN_PASSWORD;

    if (normalizedEmail !== adminEmail || password !== adminPassword) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const user: AuthUser = {
      sub: "hr-admin",
      email: adminEmail,
      name: this.configService.get<string>("ADMIN_NAME") ?? "Lường Thị Bích",
    };

    const accessToken = await this.jwtService.signAsync(user, {
      secret: this.getAccessTokenSecret(),
      expiresIn: this.getAccessTokenTtlSeconds(),
    });
    const refreshToken = await this.jwtService.signAsync(user, {
      secret: this.getRefreshTokenSecret(),
      expiresIn: this.getRefreshTokenTtlSeconds(),
    });

    return {
      accessToken,
      refreshToken,
      user,
      accessTokenMaxAgeSeconds: this.getAccessTokenTtlSeconds(),
      refreshTokenMaxAgeSeconds: this.getRefreshTokenTtlSeconds(),
    };
  }

  async refreshSession(refreshToken: string) {
    const user = await this.verifyRefreshToken(refreshToken);
    const accessToken = await this.jwtService.signAsync(user, {
      secret: this.getAccessTokenSecret(),
      expiresIn: this.getAccessTokenTtlSeconds(),
    });

    return {
      accessToken,
      user,
      accessTokenMaxAgeSeconds: this.getAccessTokenTtlSeconds(),
    };
  }

  async verifyAccessToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<AuthUser>(token, {
        secret: this.getAccessTokenSecret(),
      });

      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
      };
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }

  getAccessTokenTtlSeconds() {
    return Number(this.configService.get<string>("JWT_ACCESS_TOKEN_TTL_SECONDS") ?? 28_800);
  }

  getRefreshTokenTtlSeconds() {
    return Number(this.configService.get<string>("JWT_REFRESH_TOKEN_TTL_SECONDS") ?? 2_592_000);
  }

  private getAccessTokenSecret() {
    const secret = this.configService.get<string>("JWT_ACCESS_TOKEN_SECRET") ?? this.configService.get<string>("JWT_SECRET");

    if (secret) return secret;

    if (this.configService.get<string>("NODE_ENV") === "production") {
      throw new Error("JWT_ACCESS_TOKEN_SECRET is required in production");
    }

    return "dev-only-change-me";
  }

  private async verifyRefreshToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<AuthUser>(token, {
        secret: this.getRefreshTokenSecret(),
      });

      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
      };
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }

  private getRefreshTokenSecret() {
    const secret = this.configService.get<string>("JWT_REFRESH_TOKEN_SECRET") ?? this.configService.get<string>("JWT_SECRET");

    if (secret) return secret;

    if (this.configService.get<string>("NODE_ENV") === "production") {
      throw new Error("JWT_REFRESH_TOKEN_SECRET is required in production");
    }

    return "dev-only-refresh-change-me";
  }
}
