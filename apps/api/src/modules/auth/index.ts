import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./controller/index.controller";
import { JwtAuthGuard } from "./guards/index.guard";
import { AuthService } from "./service/index.service";

export type { AuthUser, AuthenticatedRequest } from "../../models/auth";

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
