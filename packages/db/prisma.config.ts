import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";
import { config as loadEnvFile } from "dotenv";

const configDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(configDirectory, "../..");
const environmentFiles = [".env.dev", ".env.local", ".env"];

for (const directory of [repositoryRoot, configDirectory]) {
  for (const filename of environmentFiles) {
    const path = resolve(directory, filename);
    loadEnvFile({ path, override: false, quiet: true });
  }
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
