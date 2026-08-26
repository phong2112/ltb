# TA Copilot

Lightweight TA Copilot and Career Site for one TA user.

The candidate site and TA workspace run on the same domain:

```text
/                             same-domain gateway with two site entries
/jobs                         public candidate job list
/jobs/[slug]                  public job detail
/jobs/[slug]/apply            public application form
/admin                        protected TA workspace
/admin/jobs                   protected job management
/admin/candidates             protected candidate inbox
/admin/chats                  protected first-party guest chat inbox
/admin/analytics              protected product usage, issues, and application funnel dashboard
/api/analytics/events/batch   public/optional-auth first-party event ingestion
/api/admin/analytics/*        protected aggregate analytics reports
/api/health                   public API health
/docs                         Swagger API docs when enabled
/api/applications             public application intake
/api/chat/*                   public guest-session chat API
/api/admin/chat/*             protected TA chat API
/api/admin/*                  protected TA API
```

## Current Implementation Status

### Phase 1: Foundation

Implemented:

- pnpm monorepo.
- Next.js app in `apps/web`.
- NestJS API in `apps/api`.
- Prisma schema in `packages/db`.
- Shared types in `packages/shared`.
- Docker Compose dev stack with Nginx, web, API, PostgreSQL, Redis, and optional Groq AI matching.
- Nginx reverse proxy for same-domain routing.
- Basic Auth protection for `/admin` and `/api/admin`.
- Swagger API documentation for local/API development.

### Phase 2: Jobs And Career Site

Implemented:

- Public job list.
- Public job detail.
- TA job list.
- TA create job form.
- Published/draft job support.
- SEO-friendly slug generation.

### Phase 3: Application Intake

Implemented:

- Candidate apply form.
- CV upload endpoint.
- PDF/DOC/DOCX/JPG/PNG MIME and file-signature validation.
- File size validation.
- Consent checkbox.
- Candidate/application/file metadata saved to PostgreSQL.
- CV file stored through the configured private storage driver.

### Phase 4: Candidate Inbox

Implemented:

- TA candidate inbox.
- Candidate detail page.
- Candidate file metadata.
- Application status update.
- Follow-up date.
- Internal note append.
- Activity log for application submission and status updates.

### Phase 5: AI CV Parsing And Matching

Implemented for local demo:

- PDF, DOC, and DOCX text extraction, with local `vie+eng` OCR fallback for scanned PDFs and JPG/PNG CVs.
- Groq provider using `openai/gpt-oss-120b` by default, with configurable model fallbacks.
- Optional Gemini provider for public apply CV preview autofill, isolated from Groq matching queues.
- Separate BullMQ extraction and AI matching queues backed by Redis.
- Evidence-based comparison for each JD requirement.
- Deterministic score calculation in application code.
- Parse pending, extracting, extracted, analyzing, completed, and failed backend states.
- AI summary, strengths, risks, missing requirements, screening questions, and evidence confidence.

### Phase 6: Outreach Helper

Partially implemented:

- Message templates.
- Gmail application confirmations.

Still planned:

- AI outreach drafts and copy-to-send actions.

### Phase 6A: First-party Guest Chat

Implemented:

- Guest chat widget on every public career page; no candidate login, OTP, or third-party account is required.
- PostgreSQL-backed conversations and text messages.
- Short-lived session identity in a secure `HttpOnly` cookie and an independent rotating recovery token in browser storage.
- Cookie restoration when the recovery token remains available. Clearing all site data or using a new incognito profile creates a new guest identity; it does not delete database history.
- Automatic conversation-to-candidate/application binding when the same browser submits an application.
- Protected TA inbox with search, unread counts, realtime updates, cursor pagination, and open/closed/blocked states.
- Public message throttling, origin checks, 2,000-character limit, and idempotent client message IDs.
- WebSocket-only Socket.IO delivery authenticated with 60-second tickets; Redis Pub/Sub coordinates events across API instances.
- REST remains the source of truth for message writes, history, and reconnect/foreground resynchronization. Chat screens do not use interval polling.

The realtime version remains deliberately text-only and first-party. Attachments, typing indicators, presence, and external messaging accounts are deferred.

Relevant settings: `GUEST_CHAT_SESSION_TTL_DAYS`, `GUEST_CHAT_RECOVERY_TTL_DAYS`, `GUEST_CHAT_RATE_LIMIT_MAX`, `GUEST_CHAT_RATE_LIMIT_WINDOW_SECONDS`, `CHAT_REALTIME_TICKET_SECRET`, `CHAT_REALTIME_TICKET_TTL_SECONDS`, and frontend `VITE_REALTIME_URL`.

### Phase 7: Sourcing Campaigns

Implemented foundation:

- Generate sourcing briefs and multi-source Boolean search strings from JDs.
- Run resilient LinkedIn public-profile discovery through Brave Search.
- Suggest matching Talent Pool entries and previous applicants.
- Import TA-provided profile URLs with normalization and campaign dedupe.
- Score public snippets deterministically and track candidate funnel status.

Still planned:

- Promote sourced public profiles into complete Talent Pool records with CV/contact enrichment.
- Rank candidates by richer CV evidence, source quality, and contact readiness.
- Draft personalized outreach and follow-up messages.
- Add campaign-level funnel analytics.

Public web discovery must be narrow and auditable. Use official APIs where possible, respect robots.txt, rate limits, and source terms, do not bypass access controls, and make each source adapter explicitly configurable.

### Sourcing Orchestration

The campaign detail screen can queue one retrieval-first workflow:

1. Ask Groq for bounded title/skill query expansions when core AI is enabled.
2. Search existing Talent Pool and previous applications independently.
3. Run LinkedIn X-Ray queries through the official Brave Web Search API.
4. Deduplicate profiles, calculate a deterministic potential score, and leave the final review to TA.

AI query planning is optional. Invalid AI output, quota errors, or a disabled AI provider fall back to deterministic JD queries. Brave requests are serialized, paced, bounded by a timeout, and retried for transient/rate-limit responses. Provider failures return a `DEGRADED`/`UNAVAILABLE` stage with any valid partial results instead of failing the whole sourcing workflow.

The run endpoint returns `202 Accepted` after placing work on a Redis-backed BullMQ queue. Each campaign persists its latest run state (`QUEUED`, `RUNNING`, `COMPLETED`, `DEGRADED`, or `FAILED`), so the UI can poll safely and a second request cannot duplicate an active run. A completed run stores the stage summary, not the candidate profile payload.

Relevant backend settings:

```text
SOURCING_DISCOVERY_ENABLED=true
BRAVE_SEARCH_API_KEY=...
SOURCING_DISCOVERY_MAX_QUERIES_PER_CAMPAIGN=12
SOURCING_DISCOVERY_RESULTS_PER_QUERY=10
SOURCING_DISCOVERY_MIN_INTERVAL_MS=1100
SOURCING_DISCOVERY_TIMEOUT_MS=10000
SOURCING_DISCOVERY_MAX_ATTEMPTS=3
SOURCING_ORCHESTRATION_STALE_MINUTES=30
GROQ_SOURCING_MODEL_CHAIN=openai/gpt-oss-120b,qwen/qwen3.6-27b,openai/gpt-oss-20b
GROQ_SOURCING_TIMEOUT_MS=15000
```

Keep the default 1.1-second Brave interval for plans limited to one request per second. Lower it only when the active Brave plan explicitly allows a higher request rate.

## Running Dev With One Command

Start the full Docker development stack with hot reload:

```bash
CV_STORAGE_DRIVER=local ./run.sh
```

AI matching is disabled by default for local development. Set `AI_PROVIDER=groq`, `GROQ_API_KEY`, and `REDIS_URL` when you want uploaded CVs to be analyzed by Groq.

Public apply CV preview autofill can use Gemini without enabling Groq matching. Set `PREVIEW_AI_PROVIDER=gemini`, `GEMINI_API_KEY`, and optionally `GEMINI_MODEL`, `GEMINI_BASE_URL`, and `GEMINI_TIMEOUT_MS`. If Gemini is unavailable or over quota, the public form falls back to deterministic regex extraction and still lets candidates submit manually.

Open:

```text
http://localhost:8080
http://localhost:8080/docs
```

Default protected TA credential for local/demo Docker:

```text
username: hr
password: hr123456
```

Seed demo data and start:

```bash
./run.sh seed
```

Stop the development stack:

```bash
./run.sh down
```

Reset development containers and volumes:

```bash
./run.sh reset
```

## Running The API With Docker

Start the production-style API stack:

```bash
pnpm docker:up
```

Open:

```text
http://localhost:4000/health
```

Set `WEB_ORIGIN` to your Vercel frontend origin when running this API stack
outside local checks.

Default protected TA credential for local/demo Docker:

```text
username: hr
password: hr123456
```

Change `docker/nginx/.htpasswd` before production.

Stop the stack:

```bash
pnpm docker:down
```

## Deploying The API To Render

The production frontend remains on Vercel. Deploy only the NestJS API to Render
using `render.yaml`, while keeping Neon, managed Redis, Groq, R2, and Vercel
Blob external.

Set Vercel build variable `VITE_REALTIME_URL` to the direct HTTPS Render API origin
(for example `https://your-api.onrender.com`). REST continues through `/api`; the
Socket.IO client connects to `/chat/realtime` directly using WebSocket transport.

See [docs/deployment.md](docs/deployment.md) for environment setup, deploy,
smoke test, and rollback notes.

## Mock Data

Seed demo data into the Docker PostgreSQL database:

```bash
pnpm db:seed
```

The seed is idempotent for frontend mock records. It recreates:

- 14 jobs from the current frontend mock data.
- 11 mock candidates from the current frontend mock data.
- Applications across multiple statuses.
- CV file metadata.
- AI parse/match results.
- Follow-up tasks.
- Message templates.

Public candidate data can be checked at:

```text
http://localhost:8080/jobs
```

Private TA data can be checked at:

```text
http://localhost:8080/admin/candidates
```

## Local Development

Install dependencies:

```bash
pnpm install
```

Generate Prisma client:

```bash
pnpm db:generate
```

Run lint/build/test:

```bash
pnpm lint
pnpm test
pnpm build
```

If using Docker Postgres locally, the host port is `55432` to avoid common conflicts:

```text
postgresql://postgres:postgres@localhost:55432/hr_copilot?schema=public
```

Redis host port is `56379`.

Set `AI_PROVIDER=groq` and `GROQ_API_KEY` in the backend environment to enable cloud AI matching. Set `PREVIEW_AI_PROVIDER=gemini` and `GEMINI_API_KEY` only when you want pre-submit form autofill to use Gemini.

## Demo AI CV Matching

1. Start the dev stack with `CV_STORAGE_DRIVER=local ./run.sh`.
2. Publish or select a job with explicit requirements.
3. Submit a new application with a PDF, DOC, DOCX, JPG, or PNG CV upload.
4. Open the candidate detail page. It polls the lightweight application-analysis endpoint while processing is pending.
5. Review the AI summary, match score, confidence, strengths, risks, and missing requirements.

The model never supplies the final score. It classifies every JD criterion as `met`, `partial`, `not_met`, or `unknown`; the API verifies quoted evidence against the cleaned CV payload and calculates the weighted score. Strengths, required risks, missing requirements, and screening questions are derived from those same grounded evaluations. AI output is assistive and must not automatically reject a candidate.

Scanned PDFs without a usable text layer and uploaded JPG/PNG CVs are processed locally with Tesseract `vie+eng`. OCR is limited by `OCR_MAX_PAGES` and `OCR_TIMEOUT_MS`; unreadable documents still show a failed state for manual review.

The processing pipeline first persists extracted CV text, then enqueues a separate AI matching job. Extraction concurrency and Groq request concurrency are configured independently with `CV_EXTRACTION_CONCURRENCY` and `AI_MATCH_CONCURRENCY`.

The OCR worker is reused and serialized across requests, hybrid PDFs are compared by completeness and text quality, oversized PDFs process their first configured pages, and low-confidence OCR is flagged for manual review. Stored extraction text is kept for audit; a separate normalized, PII-reduced, bounded payload is sent to AI.

## Architecture Notes

Nginx owns same-domain routing in Docker:

- `/api/admin/*` -> NestJS `/admin/*`, protected by Basic Auth.
- `/api/*` -> NestJS public API.
- `/admin*` -> Next.js TA workspace, protected by Basic Auth.
- `/*` -> Next.js public site.

The API service is not exposed directly by Docker Compose. Public access should go through Nginx.

## Next Implementation Priorities

1. Add sourcing campaign models, statuses, and campaign-to-job matching.
2. Add `/admin/sourcing` for sourcing brief, import, ranking, and funnel tracking.
3. Add manual and CSV import into Talent Pool.
4. Add outreach templates and copy-to-send workflow.
5. Add real auth/session instead of Nginx Basic Auth for production.
6. Add private object storage for CV files instead of local container volume.
7. Add an admin retry action for failed AI jobs.
8. Add email notifications for new applications.

## First-party Product Analytics

Product analytics is stored separately from the sensitive recruitment `ActivityLog`. The browser sends only typed route templates, semantic feature/action codes, normalized outcomes, duration, and allowlisted properties. It never sends form values, CV text, names, email addresses, phone numbers, messages, notes, or raw URLs/query strings. Public identity is a random `sessionStorage` value that is HMAC-hashed by the API; authenticated admin identity is derived from the JWT server-side.

Enable analytics only after applying the Prisma migration and completing the privacy review:

```text
ANALYTICS_ENABLED=true
ANALYTICS_ADMIN_ENABLED=true
ANALYTICS_HMAC_SECRET=<long-random-server-only-secret>
ANALYTICS_RAW_RETENTION_DAYS=90
VITE_ANALYTICS_ENABLED=true
VITE_APP_RELEASE=<deployment-version>
```

The main endpoints are `POST /api/analytics/events/batch` and protected reports under `/api/admin/analytics/*`. `/admin/analytics` supports bookmarkable date, audience, and feature filters. Ingestion is fail-open and duplicate event IDs are idempotent. Run authenticated `POST /api/admin/analytics/maintenance` daily: it aggregates expired raw events before deletion and removes aggregate rows older than 12 months. Disable the three analytics flags to roll back collection/dashboard without reverting the additive database migration.
