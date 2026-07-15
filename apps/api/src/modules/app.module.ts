import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "../config/env.validation";
import { ApplicationsModule } from "./applications/applications.module";
import { AuthModule } from "./auth/auth.module";
import { CandidatesModule } from "./candidates/candidates.module";
import { HealthModule } from "./health/health.module";
import { JobsModule } from "./jobs/jobs.module";
import { PrismaModule } from "./prisma/prisma.module";
import { TemplatesModule } from "./templates/templates.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        "../../.env.dev",
        "../../.env.local",
        "../../.env",
        ".env.dev",
        ".env.local",
        ".env",
      ],
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    JobsModule,
    ApplicationsModule,
    CandidatesModule,
    TemplatesModule,
  ],
})
export class AppModule {}
