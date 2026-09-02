# Development Deployment

This repository deploys the Vite web app to Vercel and the NestJS API to Render. PostgreSQL, Redis, AI providers, Gmail, and private CV storage are external managed services.

## 1. Prepare `.env.dev`

This project has one hosted environment: development. Keep its complete deployment values in the ignored root `.env.dev` file and use `.env.example` as the tracked checklist. Never commit `.env.dev` or copy its secrets into logs.

- Vercel receives the `VITE_*` build variables.
- Render receives API runtime variables, database/Redis URLs, secrets, and provider credentials.
- Keep `VITE_MAX_CV_FILE_SIZE_MB` equal to `MAX_CV_FILE_SIZE_MB`.
- Set `WEB_ORIGIN` to the canonical Vercel development origin. Add preview origins to `WEB_ORIGINS` only when they are intentionally supported.
- Use unique hosted-development values for the JWT and realtime-ticket secrets. Set an analytics HMAC secret of at least 32 characters before enabling analytics.
- Keep the R2 bucket private and use development-only credentials.
- `RENDER_DEPLOY_HOOK_URL` and `VERCEL_TOKEN` are deployment credentials used by `deploy-be.sh` and `deploy-fe.sh`; keep both only in `.env.dev`.

The API validates required and conditional variables at startup. A missing database, Redis, auth, storage, AI, analytics, sourcing, or Gmail dependency causes an explicit startup error when that feature is enabled.

## 2. Verify the revision

From the repository root:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
```

## 3. Back up and apply migrations

The `20260830090000_remove_legacy_candidate_messages` migration drops the legacy `CandidateMessage` table. Export that table or take a database backup before deployment if its historical outbound logs must remain recoverable.

Use the direct PostgreSQL connection for migrations when the application uses a pooled connection:

```bash
DATABASE_URL="$MIGRATION_DATABASE_URL" pnpm db:deploy
pnpm --filter @hr-copilot/db prisma migrate status
```

The API Docker image also runs `prisma migrate deploy` before starting. Applying the migrations explicitly first makes migration failures visible before application rollout.

## 4. Deploy order

1. Apply database migrations.
2. Deploy the Render API and wait for `/health` to return `status: ok`.
3. Deploy the Vercel web app.
4. Confirm the Vercel `/api` rewrite and `VITE_REALTIME_URL` target the same API revision.

## 5. Development smoke test

- Open the public job list and confirm `GET /api/jobs` returns only published jobs.
- Log in as the development TA and confirm `GET /api/jobs?scope=admin` includes draft/closed jobs.
- Create and update a job.
- Submit an application with consent and a valid CV; verify invalid file signatures and oversized files are rejected.
- Open the private candidate detail/CV view and retry AI analysis once.
- Start a guest chat, reply from the admin inbox, refresh both browsers, and verify history/read state persists.
- If analytics is enabled, confirm the dashboard loads and new events appear without candidate form values or CV text.
- Verify CORS rejects an unrelated browser origin.

## 6. Rollback

- Roll back the Vercel and Render revisions independently.
- Disable `VITE_ANALYTICS_ENABLED`, `ANALYTICS_ENABLED`, and `ANALYTICS_ADMIN_ENABLED` to stop analytics without reverting its additive migration.
- Do not attempt to recreate `CandidateMessage` by rolling back application code. Restore it from the pre-deploy database backup if the removed legacy data is required.
- Keep database backups until the development smoke test and data review are complete.
