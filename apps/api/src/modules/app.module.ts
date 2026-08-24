import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "@/utils/env";
import { ApplicationsModule } from "./applications";
import { AuthModule } from "./auth";
import { CandidatesModule } from "./candidates";
import { HealthModule } from "./health";
import { JobsModule } from "./jobs";
import { PrismaModule } from "./prisma";
import { TalentPoolModule } from "./talent-pool";
import { TemplatesModule } from "./templates";
import { SourcingModule } from "./sourcing";

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
    TalentPoolModule,
    TemplatesModule,
    SourcingModule,
  ],
})
export class AppModule {}
