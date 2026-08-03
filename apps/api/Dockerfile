FROM node:22-alpine AS base
WORKDIR /app
RUN npm install -g npm@12.0.2 && npm cache clean --force && corepack enable

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
RUN pnpm --filter @hr-copilot/shared build
RUN pnpm --filter @hr-copilot/api build
RUN rm -rf node_modules apps/*/node_modules packages/*/node_modules
RUN pnpm install --prod --frozen-lockfile
RUN pnpm --filter @hr-copilot/db prisma generate

FROM base AS runner
ENV NODE_ENV=production
ENV NODE_OPTIONS=--dns-result-order=ipv4first
COPY --chown=node:node --from=build /app /app
RUN mkdir -p /app/uploads && chown node:node /app/uploads
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://127.0.0.1:4000/health >/dev/null || exit 1
CMD ["sh", "-c", "cd /app/packages/db && DATABASE_URL=${MIGRATION_DATABASE_URL:-$DATABASE_URL} node node_modules/prisma/build/index.js migrate deploy && cd /app && node apps/api/dist/main.js"]
