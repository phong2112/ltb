# TA Copilot + Career Site Planning

## 1. Product Goal

Build a lightweight recruiting assistant for one TA user, not a heavy company-wide ATS.

The system should help TA:

- Publish job descriptions on a public career site.
- Receive applications and CV uploads from candidates.
- Parse CVs automatically.
- Match candidates against job descriptions.
- Summarize candidate fit and risks.
- Draft outreach/follow-up messages.
- Track personal pipeline and reminders.

Primary workflow:

```text
TA creates JD
-> system publishes job page
-> candidate applies and uploads CV
-> backend stores file privately
-> AI parses CV and matches it to JD
-> TA reviews candidate in inbox
-> AI suggests outreach/follow-up message
-> TA sends via email or copies message to Zalo/Facebook/LinkedIn
-> system tracks status and reminder
```

## 2. Target MVP Scope

### Must Have

- Public career site:
  - Job listing page.
  - Job detail page.
  - Apply form.
  - CV upload.
  - Application success page.
- TA workspace:
  - Login.
  - Create/edit/publish/close/archive jobs.
  - Candidate inbox.
  - Candidate detail.
  - Application status update.
  - Notes.
  - Follow-up date.
- AI support:
  - Extract text from PDF/DOC/DOCX.
  - Parse candidate profile into structured fields.
  - Summarize CV.
  - Match CV to selected JD.
  - Suggest screening questions.
  - Draft outreach/follow-up messages.
- Security:
  - Private CV storage.
  - Signed URLs for file access.
  - File type and size validation.
  - Rate limit apply form.
  - Consent checkbox on apply form.
  - No secrets in frontend code.

### Should Have

- Email notification when a new candidate applies.
- Email sending from TA workspace.
- Message templates with copy button for Zalo/Facebook/LinkedIn.
- Duplicate candidate detection by email, phone, and normalized name.
- Basic activity timeline.

### Not In MVP

- Multi-company support.
- Complex role-based access control.
- Native LinkedIn/Facebook/Zalo API automation.
- Bulk spam-like outreach automation.
- Recruiter performance dashboard.
- Enterprise approval workflow.

## 3. Architecture

Recommended deployment split:

```text
Next.js web app
  - public career site
  - TA workspace
  - deployed on Vercel Pro

NestJS API
  - auth/session integration
  - jobs API
  - candidates/applications API
  - file upload orchestration
  - AI service orchestration
  - background job endpoints/workers
  - deployed on container/server platform

PostgreSQL
  - source of truth for business data

Object storage
  - private CV storage
  - S3-compatible storage, Cloudflare R2, or Vercel Blob private

Redis queue
  - CV parsing jobs
  - AI matching jobs
  - email/follow-up jobs
```

Avoid deploying the main NestJS backend as Vercel Functions for MVP because CV parsing, AI calls, file handling, and background jobs are easier to control in a long-running service/container environment.

## 4. Suggested Monorepo Structure

```text
apps/
  web/
    app/
    components/
    features/
    lib/
  api/
    src/
      modules/
      common/
      jobs/
      candidates/
      applications/
      files/
      ai/
      auth/
      notifications/
packages/
  db/
    prisma/
  shared/
    src/
  config/
docs/
```

If the project starts small, keep `packages/` minimal. Do not over-abstract until there is real reuse.

## 5. Proposed Tech Stack

- Frontend: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui.
- Backend: NestJS, TypeScript, Prisma.
- Database: PostgreSQL.
- Queue: BullMQ + Redis.
- Storage: S3-compatible private bucket or Vercel Blob private.
- Email: Gmail SMTP for the current low-volume MVP confirmation emails.
- Auth: Auth.js/NextAuth, Clerk, or a simple NestJS JWT/session setup.
- AI: provider abstraction, initially OpenAI or compatible LLM API.
- Deploy:
  - Web: Vercel Pro.
  - API: Railway, Fly.io, Render, AWS ECS, or Google Cloud Run.
  - DB: Supabase, Neon, or managed Postgres.
  - Redis: Upstash or Redis Cloud.

## 6. Core Data Model

Initial entities:

- `User`
- `Job`
- `JobQuestion`
- `Candidate`
- `Application`
- `CandidateFile`
- `CvParseResult`
- `MatchResult`
- `MessageTemplate`
- `CandidateMessage`
- `FollowUpTask`
- `ActivityLog`

Candidate identity rules for the MVP:

- Public applicants are not authenticated users, so `Application` remains the source of truth for each submission.
- Store submission snapshots on `Application` (`submittedFullName`, `submittedEmail`, `submittedPhone`, links, cover note, TA notes), not in a shared candidate note/profile field.
- Keep application-scoped child records (`CandidateFile`, `CandidateMessage`, `FollowUpTask`) linked by `applicationId` only; derive their candidate through `Application.candidateId`.
- Store normalized email and phone on `Candidate` for lookup, but do not use name as an automatic duplicate key.
- Store normalized email and phone snapshots on `Application` and enforce one application per job per normalized email/phone.
- Do not let unauthenticated duplicate submissions overwrite an existing candidate, application, or CV.
- Keep CV parse status controlled by enum values (`PENDING`, `COMPLETED`, `FAILED`) instead of free-form strings.
- Store direct nullable audit links on `ActivityLog` (`applicationId`, `jobId`, `candidateFileId`) for sensitive actions; keep JSON metadata only as context.
- Store active CV objects in private Cloudflare R2. When a job becomes `ARCHIVED`, move its CV objects to private Vercel Blob storage and mark `CandidateFile.storageTier=ARCHIVE`; restore them to R2 when the job is restored.

Recommended job statuses:

```text
draft
published
closed
archived
```

Job records should not be hard-deleted from normal TA workflows. If a published job is no longer accepting applications, move it to `closed`. If TA wants to hide old jobs from the active workspace, move them to `archived`. Keep applications, CV metadata, parse results, and match results intact for audit and review.

Recommended application statuses:

```text
new
reviewing
contacted
replied
screening
interview
offer
rejected
talent_pool
```

## 7. Implementation Phases

### Phase 1: Foundation

- Initialize monorepo.
- Add linting, formatting, TypeScript config.
- Create Next.js app.
- Create NestJS app.
- Create Prisma schema and initial migration.
- Add environment config validation.
- Add basic auth.

### Phase 2: Jobs And Career Site

- Build job CRUD in TA workspace.
- Build public job listing and job detail pages.
- Add publish/close/archive flow.
- Add SEO-friendly job slugs.

### Phase 3: Application Intake

- Build apply form.
- Add CV upload.
- Store files privately.
- Save candidate/application records.
- Add consent checkbox.
- Add rate limit and basic anti-spam protection.
- Send TA notification on new application.

### Phase 4: Candidate Inbox

- Build candidate list with filters.
- Build candidate detail page.
- Add status transitions.
- Add internal notes.
- Add activity timeline.
- Add follow-up date and reminder view.

### Phase 5: AI CV Parsing And Matching

- Add background queue.
- Extract text from uploaded CV.
- Parse structured candidate profile.
- Match candidate to JD.
- Save parse and match results.
- Render AI summary in candidate detail.
- Handle failed parsing gracefully.

### Phase 6: Outreach Helper

- Add message templates.
- Add AI-assisted draft generation.
- Add copy-to-send buttons for Zalo/Facebook/LinkedIn.
- Add direct email sending if configured.
- Log outreach activity.

### Phase 7: Hardening And Launch

- Add tests for core service logic.
- Add upload abuse controls.
- Add audit logs for file access.
- Review security and consent copy.
- Configure production deployment.
- Add monitoring and error tracking.

## 8. Security Requirements

- CV files must never be public by default.
- Use signed URLs with short expiry for file preview/download.
- Limit upload size, for example 10 MB per CV.
- Allow only expected file types: PDF, DOC, DOCX.
- Validate MIME type and extension.
- Consider malware scanning before production launch.
- Add rate limits to public apply endpoints.
- Add CAPTCHA/Turnstile if spam appears.
- Keep all AI/API/storage/email keys server-side only.
- Log sensitive actions such as CV view/download.
- Do not send CV content to third-party AI providers without customer approval.
- Maintain consent text and privacy policy for candidate data.

## 9. Definition Of Done For MVP

The MVP is done when:

- TA can create and publish a JD.
- Candidate can open a public JD page and apply with CV.
- CV is stored privately and visible only after TA login.
- Candidate appears in TA inbox.
- AI summary and match result are generated or a clear failed state is shown.
- TA can update status, write notes, and set follow-up.
- TA can generate/copy outreach messages.
- Production environment is deployed and documented.
- Core happy paths have been tested manually and with automated tests where practical.

## 10. Current Build Notes

The current implementation uses one public domain with Nginx routing:

```text
/jobs and /jobs/*        Candidate site
/admin and /admin/*      TA workspace
/api/applications        Public candidate intake API
/api/admin/*             Protected TA API
/api/health              Public health check
```

Docker Compose runs:

- `nginx` as the same-domain reverse proxy.
- `web` for Next.js.
- `api` for NestJS.
- `db` for PostgreSQL.
- `redis` for future queue workers.

Local Docker TA workspace uses the in-app demo login only:

```text
email: v.bichlt6@vinsmartfuture.tech
password: demo123
```

This is acceptable for local/demo only. Replace with real server-side app auth before production.
