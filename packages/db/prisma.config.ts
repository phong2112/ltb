import { defineConfig } from "prisma/config";
import { config as loadEnvFile } from "dotenv";

for (const path of [
  "../../.env.dev",
  "../../.env.local",
  "../../.env",
  ".env.dev",
  ".env.local",
  ".env",
]) {
  loadEnvFile({ path, override: false, quiet: true });
}

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:55432/hr_copilot?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
