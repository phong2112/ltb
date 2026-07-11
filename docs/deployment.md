# Deployment Guide

This project is a pnpm monorepo with:

- `apps/web`: Vite React frontend.
- `apps/api`: NestJS API.
- `docker-compose.yml`: local/full-stack Docker setup with Nginx, web, API, PostgreSQL, Redis, and upload volume.

## Recommended Production Shape

Use Vercel for the frontend only.

Use a container host or server for the Docker stack pieces that need long-running services:

- NestJS API.
- PostgreSQL.
- Redis.
- Private CV storage integration.
- Optional Nginx reverse proxy.

Do not deploy PostgreSQL, Redis, or persistent upload volumes as Vercel frontend output.

## 1. Verify Local Build

If `pnpm` is not directly available, use Corepack:

```bash
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @hr-copilot/web build
corepack pnpm --filter @hr-copilot/api build
docker compose config
```

Expected frontend output:

```text
apps/web/dist
```

## 2. Deploy Frontend To Vercel

Import the repository into Vercel.

Use the root of the repository as the Vercel project root. The root `vercel.json` configures:

```text
Install Command: corepack enable && pnpm install --frozen-lockfile
Build Command: pnpm --filter @hr-copilot/web build
Output Directory: apps/web/dist
Framework: Vite
```

Set production environment variables in Vercel:

```text
NEXT_PUBLIC_APP_URL=https://your-web-domain.com
NEXT_PUBLIC_API_BASE_PATH=https://your-api-domain.com
VITE_API_BASE_PATH=https://your-api-domain.com
VITE_MAX_CV_FILE_SIZE_MB=10
```

Only use `NEXT_PUBLIC_*` for values that are safe to expose in browser code. Do not put private API keys, database URLs, Redis URLs, or storage secrets in Vercel frontend environment variables.

## 3. Ship The Docker Stack

For a single-server Docker deployment, copy the repository to the server, create production env values, and run Compose.

On the server:

```bash
corepack enable
docker compose build
docker compose up -d
docker compose ps
```

Before exposing it publicly, replace local defaults in `docker-compose.yml` with production values:

```text
WEB_ORIGIN=https://your-web-domain.com
DATABASE_URL=postgresql://<user>:<password>@db:5432/hr_copilot?schema=public
REDIS_URL=redis://redis:6379
ADMIN_EMAIL=v.bichlt6@vinsmartfuture.tech
ADMIN_PASSWORD=<strong-admin-password>
ADMIN_NAME=Lường Thị Bích
JWT_ACCESS_TOKEN_SECRET=<long-random-secret>
JWT_ACCESS_TOKEN_TTL_SECONDS=28800
JWT_REFRESH_TOKEN_SECRET=<different-long-random-secret>
JWT_REFRESH_TOKEN_TTL_SECONDS=2592000
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAMESITE=none
CV_STORAGE_DRIVER=vercel-blob
BLOB_STORE_ID=<your-vercel-blob-store-id>
BLOB_READ_WRITE_TOKEN=<local-or-non-vercel-token-if-needed>
UPLOAD_DIR=/app/uploads
MAX_CV_FILE_SIZE_MB=10
```

`CV_STORAGE_DRIVER=vercel-blob` stores uploaded CV files in Vercel Blob Private and saves the Blob URL in PostgreSQL `CandidateFile.path`. `UPLOAD_DIR` remains a local development fallback only. In production, keep CV blobs private and serve them through the API after HR authentication checks.

Admin login uses a short-lived JWT access token stored in an `httpOnly` cookie named `access_token` and a longer-lived refresh token stored in an `httpOnly` cookie named `refresh_token`. The frontend calls `/auth/refresh` when an admin request returns `401`. If the Vercel frontend and API are on different HTTPS domains, use `AUTH_COOKIE_SECURE=true` and `AUTH_COOKIE_SAMESITE=none`; keep `JWT_ACCESS_TOKEN_SECRET` and `JWT_REFRESH_TOKEN_SECRET` private and never expose them as frontend variables.

Also change the PostgreSQL username/password and protect public network access. Do not expose database and Redis ports publicly in production.

## 4. Domain Wiring

Use two domains or subdomains:

```text
Frontend: https://your-web-domain.com
API:      https://your-api-domain.com
```

Set the API service CORS origin:

```text
WEB_ORIGIN=https://your-web-domain.com
```

If using the existing Nginx config, requests under `/api/` are proxied to the NestJS API. If the frontend is on Vercel and the API is on a separate domain, configure frontend API calls to use the API domain instead of a local `/api` path.

## 5. Database Migration

The API Dockerfile currently runs Prisma migrations before starting the API:

```bash
pnpm --filter @hr-copilot/db prisma migrate deploy
pnpm --filter @hr-copilot/api start:prod
```

Check container logs after first boot:

```bash
docker compose logs -f api
```

## 6. Smoke Test

After deployment:

```bash
curl https://your-api-domain.com/health
curl https://your-web-domain.com
```

Then manually verify:

- Public page loads from Vercel.
- API responds over HTTPS.
- Admin routes are protected.
- Application form works.
- CV upload stores files privately.
- API logs do not print secrets or full CV content.

## 7. Rollback

For Vercel, promote the previous successful deployment from the Vercel dashboard.

For Docker:

```bash
docker compose pull
docker compose up -d
docker compose logs -f api
```

Keep database backups before running production migrations.
