# Agent Working Guide

This file defines the working rules for coding agents in this repository. Read this file and `PLANNING.md` before making changes.

## 1. Product Context

This project is a lightweight HR Copilot and Career Site for one HR user.

The product is not intended to be an enterprise ATS in the MVP. Keep implementation focused on:

- Publishing jobs.
- Receiving candidate applications.
- Uploading and protecting CV files.
- Parsing and matching CVs with AI.
- Helping HR review candidates and follow up faster.

## 2. Default Engineering Rules

- Prefer simple, explicit code over premature abstraction.
- Follow the current codebase patterns before introducing new ones.
- Keep changes scoped to the requested feature or bug.
- Do not add enterprise complexity unless the planning file has been updated to require it.
- Do not silently change product scope.
- Do not introduce scraping of LinkedIn, Facebook, ITviec, VietnamWorks, or Zalo.
- Prefer official APIs and user-provided links/files.
- Treat candidate data and CVs as sensitive personal data.

## 3. Setup Rules

Expected local prerequisites:

- Node.js LTS.
- pnpm as the package manager unless the repo clearly uses another tool.
- PostgreSQL.
- Redis for queues.
- S3-compatible object storage or local storage adapter for development.

Recommended commands once implemented:

```bash
pnpm install
pnpm lint
pnpm test
pnpm build
pnpm dev
```

Do not invent final commands if package scripts do not exist yet. Inspect `package.json` first.

## 4. Environment Rules

Use explicit environment variables. Validate them at application startup.

Common variables:

```text
DATABASE_URL
REDIS_URL
STORAGE_ENDPOINT
STORAGE_BUCKET
STORAGE_ACCESS_KEY_ID
STORAGE_SECRET_ACCESS_KEY
OPENAI_API_KEY
EMAIL_API_KEY
NEXT_PUBLIC_APP_URL
API_BASE_URL
```

Rules:

- Never commit real secrets.
- Do not expose private keys through `NEXT_PUBLIC_*`.
- Keep `.env.example` updated when adding required variables.
- Use separate development, staging, and production values.

## 5. Code Style

TypeScript:

- Enable and respect strict typing where configured.
- Avoid `any`; use `unknown`, DTOs, schemas, or explicit types.
- Keep DTOs and domain types clear.
- Avoid large functions with mixed responsibilities.
- Prefer named functions for non-trivial business logic.

Formatting:

- Use the repository formatter/linter.
- Do not reformat unrelated files.
- Keep imports clean and consistent with the configured tooling.

Comments:

- Add comments only when they explain non-obvious decisions.
- Do not add comments that restate the code.

## 6. Next.js Rules

- Keep public career pages and HR workspace routes clearly separated.
- Use server components by default when practical.
- Use client components only for interactive UI.
- Do not call private backend APIs directly from unauthenticated client code.
- Keep forms accessible and mobile-friendly.
- Validate form data on both client and server.
- Use stable loading, empty, and error states.
- Do not expose candidate CV URLs directly unless they are signed and short-lived.

Suggested route shape:

```text
/jobs
/jobs/[slug]
/jobs/[slug]/apply
/apply/success
/admin
/admin/jobs
/admin/candidates
/admin/candidates/[id]
```

## 7. NestJS Rules

- Organize features by module.
- Keep controllers thin.
- Put business logic in services.
- Put database access behind services/repositories where the codebase pattern supports it.
- Validate input with DTOs and pipes.
- Return explicit error responses.
- Avoid long-running work in request handlers; enqueue background jobs instead.
- Keep AI provider integration behind an interface/service so providers can change.

Suggested module names:

```text
AuthModule
JobsModule
CandidatesModule
ApplicationsModule
FilesModule
AiModule
NotificationsModule
FollowUpsModule
```

## 8. Database Rules

- Use migrations for schema changes.
- Name fields clearly and consistently.
- Use enums for controlled statuses when practical.
- Add indexes for common filters:
  - application status
  - job id
  - candidate email
  - candidate phone
  - created date
- Do not store raw CV file content in PostgreSQL.
- Store file metadata in DB and binary files in object storage.

## 9. File Upload And CV Rules

- CV uploads are sensitive.
- Default storage access must be private.
- Generate signed URLs only after auth checks.
- Set short expiry on signed URLs.
- Enforce max file size.
- Validate file type.
- Normalize filenames before storage.
- Do not trust user-provided MIME type alone.
- Log file view/download activity when implemented.

## 10. AI Rules

- AI output is assistive, not final truth.
- Always store the raw parsed text or structured output separately from human-edited notes.
- Show uncertainty and failed parse states clearly.
- Keep prompts versioned in code or prompt files.
- Do not put secrets or full env dumps in prompts.
- Do not send unnecessary personal data to AI providers.
- For matching, return both score and reasons.

Expected AI output shape for candidate matching:

```json
{
  "summary": "Short candidate summary",
  "matchScore": 78,
  "strengths": ["..."],
  "risks": ["..."],
  "missingRequirements": ["..."],
  "screeningQuestions": ["..."]
}
```

## 11. Security And Privacy Rules

- Require login for HR workspace.
- Protect all admin APIs.
- Rate-limit public forms.
- Add anti-spam protection before real launch.
- Do not log full CV contents, tokens, or secrets.
- Keep audit trails for sensitive actions when possible.
- Include consent checkbox in apply forms.
- Keep privacy/security copy clear and reviewable by the customer.
- Use HTTPS in production.

## 12. Testing Rules

Prioritize tests for:

- Job creation and publishing.
- Application submission.
- File upload validation.
- Candidate status transitions.
- CV parsing job state handling.
- AI matching service with mocked provider.
- Auth guards around private resources.

Testing expectations:

- Add unit tests for core business logic.
- Add integration tests for important API endpoints when practical.
- Manually verify the full candidate application flow before claiming completion.
- If tests cannot be run, state the reason clearly in the final response.

## 13. UI Rules

- Build the usable product screen first, not a marketing landing page.
- Keep HR workspace dense, clear, and task-focused.
- Use tables/lists for candidate review where appropriate.
- Use cards only for repeated items or genuinely framed tools.
- Avoid decorative UI that slows down HR work.
- Ensure text does not overflow buttons, cards, or tables.
- Include clear empty states and failed states.

## 14. Deployment Rules

Recommended production split:

- Next.js web app on Vercel Pro.
- NestJS API on a container/server platform.
- PostgreSQL on a managed database provider.
- Redis on a managed Redis provider.
- CV storage in private object storage.

Before production:

- Set production env vars.
- Configure domain and CORS.
- Verify upload limits.
- Verify signed URL behavior.
- Verify private routes and APIs.
- Add error monitoring.
- Add backup policy for database.

## 15. Documentation Rules

Update documentation when changing:

- Environment variables.
- Setup commands.
- Architecture decisions.
- Data model.
- Deployment process.
- Security-sensitive flows.

Keep documentation practical. Future agents should be able to resume work from these files without guessing product intent.

## 16. Completion Checklist

Before final response:

- Check changed files.
- Run relevant lint/tests/build if available.
- Report what changed.
- Report verification performed.
- Report any skipped verification and why.

