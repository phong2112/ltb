import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuthUser } from "./auth.types";

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const adminEmail = this.configService
      .getOrThrow<string>("ADMIN_EMAIL")
      .trim()
      .toLowerCase();
    const adminPassword =
      this.configService.getOrThrow<string>("ADMIN_PASSWORD");

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
    return (
      this.configService.get<number>("JWT_ACCESS_TOKEN_TTL_SECONDS") ?? 28_800
    );
  }

  getRefreshTokenTtlSeconds() {
    return (
      this.configService.get<number>("JWT_REFRESH_TOKEN_TTL_SECONDS") ??
      2_592_000
    );
  }

  private getAccessTokenSecret() {
    return this.configService.getOrThrow<string>("JWT_ACCESS_TOKEN_SECRET");
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
    return this.configService.getOrThrow<string>("JWT_REFRESH_TOKEN_SECRET");
  }
}
