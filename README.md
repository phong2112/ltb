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
/api/health                   public API health
/docs                         Swagger API docs when enabled
/api/applications             public application intake
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
- Docker Compose with Nginx, web, API, PostgreSQL, Redis, and local Ollama for development.
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
- PDF/DOC/DOCX MIME validation.
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

- PDF, DOC, and DOCX text extraction.
- Ollama provider using the local `qwen3:4b` model.
- BullMQ background jobs backed by Redis.
- Evidence-based comparison for each JD requirement.
- Deterministic score calculation in application code.
- Parse pending, completed, and failed UI states.
- AI summary, strengths, risks, missing requirements, screening questions, and evidence confidence.

### Phase 6: Outreach Helper

Not implemented yet:

- Message templates.
- AI outreach drafts.
- Copy-to-send actions.
- Email sending.

## Running Dev With One Command

Start the full Docker development stack with hot reload:

```bash
CV_STORAGE_DRIVER=local ./run.sh
```

The first start downloads `qwen3:4b` into the persistent `ollama_data` Docker volume. Later starts reuse the model. Set `OLLAMA_MODEL` before running the command to try another locally available model.

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

## Running With Docker

Start the full stack:

```bash
pnpm docker:up
```

Open:

```text
http://localhost:8080
```

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

Ollama host port is `11434`. Check the downloaded model with:

```bash
docker compose -f docker-compose.dev.yml --project-name hr-copilot-dev exec ollama ollama list
```

## Demo AI CV Matching

1. Start the dev stack with `CV_STORAGE_DRIVER=local ./run.sh`.
2. Publish or select a job with explicit requirements.
3. Submit a new application with a PDF, DOC, or DOCX CV upload.
4. Open the candidate detail page. It refreshes while the BullMQ job is pending.
5. Review the Qwen summary, match score, confidence, strengths, risks, and missing requirements.

The model never supplies the final score. It classifies every JD criterion as `met`, `partial`, `not_met`, or `unknown` with CV evidence; the API calculates the weighted score. AI output is assistive and must not automatically reject a candidate.

Scanned PDFs without an extractable text layer show a failed state for manual review. OCR is intentionally outside this local demo.

## Architecture Notes

Nginx owns same-domain routing in Docker:

- `/api/admin/*` -> NestJS `/admin/*`, protected by Basic Auth.
- `/api/*` -> NestJS public API.
- `/admin*` -> Next.js TA workspace, protected by Basic Auth.
- `/*` -> Next.js public site.

The API service is not exposed directly by Docker Compose. Public access should go through Nginx.

## Next Implementation Priorities

1. Add real auth/session instead of Nginx Basic Auth for production.
2. Add private object storage for CV files instead of local container volume.
3. Add OCR fallback for scanned PDFs.
4. Add an admin retry action for failed AI jobs.
5. Add outreach templates and copy-to-send workflow.
6. Add email notifications for new applications.
