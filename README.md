# HR Copilot

Lightweight HR Copilot and Career Site for one HR user.

The candidate site and HR workspace run on the same domain:

```text
/                             same-domain gateway with two site entries
/jobs                         public candidate job list
/jobs/[slug]                  public job detail
/jobs/[slug]/apply            public application form
/admin                        protected HR workspace
/admin/jobs                   protected job management
/admin/candidates             protected candidate inbox
/api/health                   public API health
/docs                         Swagger API docs when enabled
/api/applications             public application intake
/api/admin/*                  protected HR API
```

## Current Implementation Status

### Phase 1: Foundation

Implemented:

- pnpm monorepo.
- Next.js app in `apps/web`.
- NestJS API in `apps/api`.
- Prisma schema in `packages/db`.
- Shared types in `packages/shared`.
- Docker Compose with Nginx, web, API, PostgreSQL, and Redis.
- Nginx reverse proxy for same-domain routing.
- Basic Auth protection for `/admin` and `/api/admin`.
- Swagger API documentation for local/API development.

### Phase 2: Jobs And Career Site

Implemented:

- Public job list.
- Public job detail.
- HR job list.
- HR create job form.
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
- CV file stored in container volume.

### Phase 4: Candidate Inbox

Implemented:

- HR candidate inbox.
- Candidate detail page.
- Candidate file metadata.
- Application status update.
- Follow-up date.
- Internal note append.
- Activity log for application submission and status updates.

### Phase 5: AI CV Parsing And Matching

Implemented as MVP stub:

- AI service boundary exists in `apps/api/src/modules/ai`.
- Initial match result is generated after application submission.
- Candidate detail renders summary, match score, strengths, risks, and screening questions.

Not implemented yet:

- Real PDF/DOC/DOCX text extraction.
- Real LLM parsing.
- Background queue workers.

### Phase 6: Outreach Helper

Not implemented yet:

- Message templates.
- AI outreach drafts.
- Copy-to-send actions.
- Email sending.

## Running Dev With One Command

Start the full Docker development stack with hot reload:

```bash
./run.sh
```

Open:

```text
http://localhost:8080
http://localhost:8080/docs
```

Default protected HR credential for local/demo Docker:

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

Default protected HR credential for local/demo Docker:

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

- 6 jobs from the current frontend mock data, including 5 published candidate-facing jobs.
- 5 mock candidates from the current frontend mock data.
- Applications across multiple statuses.
- CV file metadata.
- AI parse/match results.
- Follow-up tasks.
- Message templates.

Public candidate data can be checked at:

```text
http://localhost:8080/jobs
```

Private HR data can be checked at:

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

## Architecture Notes

Nginx owns same-domain routing in Docker:

- `/api/admin/*` -> NestJS `/admin/*`, protected by Basic Auth.
- `/api/*` -> NestJS public API.
- `/admin*` -> Next.js HR workspace, protected by Basic Auth.
- `/*` -> Next.js public site.

The API service is not exposed directly by Docker Compose. Public access should go through Nginx.

## Next Implementation Priorities

1. Add real auth/session instead of Nginx Basic Auth for production.
2. Add private object storage for CV files instead of local container volume.
3. Add BullMQ workers for CV parsing and AI matching.
4. Add real CV text extraction for PDF/DOC/DOCX.
5. Add AI prompts/provider integration.
6. Add outreach templates and copy-to-send workflow.
7. Add email notifications for new applications.
