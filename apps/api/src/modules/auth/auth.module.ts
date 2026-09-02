import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerModule } from "@nestjs/throttler";
import { AuthController } from "./controller/index.controller";
import { JwtAuthGuard } from "./guards/index.guard";
import { AuthService } from "./service/index.service";

@Module({
  imports: [
    JwtModule.register({}),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          limit: config.get<number>("AUTH_LOGIN_RATE_LIMIT_MAX") ?? 5,
          ttl: (config.get<number>("AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS") ?? 60) * 1000,
        },
      ],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
