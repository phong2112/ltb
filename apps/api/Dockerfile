FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @hr-copilot/db prisma generate
RUN pnpm --filter @hr-copilot/api build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app /app
RUN mkdir -p /app/uploads
EXPOSE 4000
CMD ["sh", "-c", "pnpm --filter @hr-copilot/db prisma migrate deploy && pnpm --filter @hr-copilot/api start:prod"]
