# GROQ AI Implementation Plan

## Context

LTB stable branch currently does not run AI inference.

Current `main` state:

- `packages/db/prisma/schema.prisma` already has `CvParseResult` and `MatchResult`.
- `apps/api/src/modules` does not have an `ai` module.
- `apps/api/src/modules/candidates/candidates.service.ts` does not include `cvParseResult` or `matchResult` in candidate responses.
- `apps/web/src/app/data-model.ts` and `data-types.ts` do not map AI results to frontend types.
- README says Phase 5 AI CV Parsing And Matching is not enabled on stable branch.

There is an older local-AI implementation on `feature/ai-agent`. Do not deploy local model infrastructure. Use that branch only as a reference for CV extraction, prompts, scoring, queue structure, and tests.

## Goal

Replace local AI inference with GROQ API cloud inference.

The backend should:

1. Accept candidate applications and uploaded CVs as it does today.
2. Extract readable text from the uploaded CV.
3. Send CV text plus JD data to GROQ API.
4. Parse a structured JSON response.
5. Persist the result in `CvParseResult` and `MatchResult`.
6. Expose AI status and match result to the TA admin UI.

## Non-Goals

- Do not run or deploy local model infrastructure.
- Do not require GPU infrastructure.
- Do not expose `GROQ_API_KEY` to the frontend.
- Do not make GROQ calls from the browser.
- Do not hard-code match score values.
- Do not add a manual endpoint that requires the caller to paste CV text as the primary flow.

## Recommended Architecture

Use provider abstraction:

```ts
export const AI_PROVIDER = Symbol("AI_PROVIDER");

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  analyzeMatch(input: AnalyzeMatchInput): Promise<ProviderMatchAnalysis>;
}
```

Implement:

- `GroqAiProvider` for cloud inference.
- `AiService` for extraction, analysis orchestration, DB persistence.
- Optional `AiQueueService` for async processing and retry.

Preferred production flow:

```text
Candidate submits application
  -> API stores Application + CandidateFile
  -> API creates/upserts CvParseResult as PENDING
  -> API enqueues AI job or starts background processing
  -> Extract CV text
  -> Call GROQ
  -> Validate JSON
  -> Update CvParseResult + upsert MatchResult
  -> Admin UI reads result from candidate API
```

## Dependencies

Add to `apps/api/package.json`:

```bash
pnpm --filter @hr-copilot/api add groq-sdk zod
```

If porting CV extraction from `feature/ai-agent`, also add:

```bash
pnpm --filter @hr-copilot/api add pdf-parse mammoth word-extractor tesseract.js @tesseract.js-data/eng @tesseract.js-data/vie
pnpm --filter @hr-copilot/api add -D @types/word-extractor
```

If using BullMQ queue:

```bash
pnpm --filter @hr-copilot/api add bullmq
```

Do not add local model provider SDKs.

## Environment Variables

Add to `.env.example`, deployment docs, and Render/Vercel backend env:

```env
AI_PROVIDER=groq
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_TIMEOUT_MS=120000
```

If queue is enabled:

```env
REDIS_URL=redis://localhost:6379
AI_JOB_ATTEMPTS=2
CV_EXTRACTION_CONCURRENCY=2
AI_MATCH_CONCURRENCY=1
```

Validation rules in `apps/api/src/config/env.validation.ts`:

- `AI_PROVIDER` can be absent or one of `disabled`, `groq`.
- Require `GROQ_API_KEY` only when `AI_PROVIDER=groq`.
- `GROQ_TIMEOUT_MS` must be a positive integer when provided.
- If BullMQ queue is used and `AI_PROVIDER=groq`, require `REDIS_URL`.

## Database Work

Current `CvParseStatus` only has:

```prisma
enum CvParseStatus {
  PENDING
  COMPLETED
  FAILED
}
```

Recommended update:

```prisma
enum CvParseStatus {
  PENDING
  EXTRACTING
  EXTRACTED
  ANALYZING
  COMPLETED
  FAILED
}
```

Create a Prisma migration after editing schema:

```bash
pnpm db:migrate
```

If the implementation chooses to avoid new statuses, simplify service code accordingly. Do not copy status-dependent code from `feature/ai-agent` without updating the enum.

## Backend Files To Add

Create:

```text
apps/api/src/modules/ai/ai.module.ts
apps/api/src/modules/ai/ai.service.ts
apps/api/src/modules/ai/ai.types.ts
apps/api/src/modules/ai/ai.prompt.ts
apps/api/src/modules/ai/groq-ai.provider.ts
apps/api/src/modules/ai/match-scoring.ts
apps/api/src/modules/ai/cv-text-extractor.service.ts
apps/api/src/modules/ai/cv-ocr.service.ts
```

Optional queue:

```text
apps/api/src/modules/ai/ai-queue.service.ts
```

Reference source:

```bash
git show feature/ai-agent:apps/api/src/modules/ai/ai.service.ts
git show feature/ai-agent:apps/api/src/modules/ai/ai.prompt.ts
git show feature/ai-agent:apps/api/src/modules/ai/match-scoring.ts
git show feature/ai-agent:apps/api/src/modules/ai/cv-text-extractor.service.ts
git show feature/ai-agent:apps/api/src/modules/ai/cv-ocr.service.ts
```

Do not port:

```text
apps/api/src/modules/ai/local-ai.provider.ts
```

Replace it with `groq-ai.provider.ts`.

## GROQ Provider Requirements

`GroqAiProvider` should:

- Read `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_TIMEOUT_MS` from `ConfigService`.
- Use `groq-sdk`.
- Send system and user prompts via chat completions.
- Request JSON output if the selected GROQ model supports it.
- Parse and validate the response using Zod.
- Return `ProviderMatchAnalysis`.
- Log provider name, model, elapsed time, input sizes, and validation failures.
- Never log `GROQ_API_KEY`.

Suggested response shape:

```ts
const matchAnalysisSchema = z.object({
  profile: z.object({
    currentRole: z.string().nullable(),
    totalYearsExperience: z.number().min(0).max(60).nullable(),
    skills: z.array(z.string()).max(30),
    languages: z.array(z.string()).max(10),
  }),
  summary: z.string().min(1).max(1200),
  evaluations: z.array(z.object({
    criterionId: z.string(),
    status: z.enum(["met", "partial", "not_met", "unknown"]),
    evidence: z.array(z.string()).max(3),
    reason: z.string().min(1).max(500),
  })).max(20),
  strengths: z.array(z.string()).max(6),
  risks: z.array(z.string()).max(6),
  screeningQuestions: z.array(z.string()).max(6),
});
```

## AI Service Requirements

`AiService` should:

- Find application by `applicationId`.
- Find the latest CV file for that application.
- Extract CV text from file storage using `CvStorageService`.
- Store extracted text in `CvParseResult.extractedText`.
- Build matching criteria from JD requirements.
- Send limited input to GROQ:
  - CV text max around 45,000 chars.
  - JD description max around 12,000 chars.
- Validate provider response.
- Calculate score using deterministic scoring logic.
- Upsert `MatchResult`.
- Update `CvParseResult` with:
  - `status`
  - `summary`
  - `structuredData`
  - `errorMessage`
  - `candidateFileId`
- Create `ActivityLog` entries for extraction/analysis success and failure.

## Application Submit Integration

Update `apps/api/src/modules/applications/applications.module.ts`:

- Import `AiModule`.

Update `apps/api/src/modules/applications/applications.service.ts`:

- Inject queue or AI service.
- After application and CV file are persisted, create/upsert `CvParseResult`.
- Enqueue AI processing if `AI_PROVIDER=groq`.
- Do not block the public application submission on a full GROQ analysis if queue/background processing is available.
- If no CV file was uploaded, skip AI processing gracefully.

Preferred behavior:

```text
Submit succeeds even if enqueue fails.
System logs AI enqueue failure.
CvParseResult becomes FAILED only when processing was actually attempted and failed.
```

## Admin Retry Endpoint

Add an admin-only retry endpoint:

```http
POST /admin/candidates/applications/:applicationId/ai/retry
```

Behavior:

- Requires `JwtAuthGuard`.
- Resets or upserts `CvParseResult` to `PENDING`.
- Enqueues or starts processing again.
- Returns current AI status.

This is important because GROQ/network/JSON failures can happen.

## Candidate API Response

Update `candidateApplicationInclude` in:

```text
apps/api/src/modules/candidates/candidates.service.ts
```

Include:

```ts
cvParseResult: true,
matchResult: true,
```

Ensure list and detail candidate APIs return those relations.

## Frontend Work

Update types:

```text
apps/web/src/app/data-types.ts
apps/web/src/app/data-model.ts
```

Add fields to `ApiApplication`:

```ts
cvParseResult?: {
  status: "PENDING" | "EXTRACTING" | "EXTRACTED" | "ANALYZING" | "COMPLETED" | "FAILED";
  summary?: string | null;
  errorMessage?: string | null;
  structuredData?: unknown;
} | null;

matchResult?: {
  score: number;
  strengths: unknown;
  risks: unknown;
  missingRequirements: unknown;
  screeningQuestions: unknown;
} | null;
```

Add mapped fields to `Candidate`:

```ts
aiStatus: string;
aiSummary: string;
matchScore?: number;
matchStrengths: string[];
matchRisks: string[];
missingRequirements: string[];
suggestedScreeningQuestions: string[];
```

Update candidate detail UI:

- Show AI status.
- Show match score when available.
- Show summary, strengths, risks, missing requirements.
- Show retry button when status is `FAILED`.

Do not put `GROQ_API_KEY` or model config in frontend env.

## Testing Plan

Backend tests:

- `env.validation.spec.ts`
  - accepts disabled AI without GROQ key.
  - rejects `AI_PROVIDER=groq` without `GROQ_API_KEY`.
  - accepts valid GROQ config.
- `groq-ai.provider.spec.ts`
  - mocks GROQ response and validates parsed output.
  - rejects invalid JSON.
  - rejects schema-invalid JSON.
- `ai.service.spec.ts`
  - extracts CV text and updates `CvParseResult`.
  - calls provider with truncated inputs.
  - upserts `MatchResult`.
  - marks failure on provider errors.
- `applications.service.spec.ts`
  - creates pending AI result and enqueues when CV is uploaded.
  - skips AI when no CV exists.
- `candidates.service.spec.ts`
  - includes `cvParseResult` and `matchResult`.

Frontend tests if existing test setup supports it:

- Candidate mapper handles missing AI result.
- Candidate mapper handles completed match result.
- Candidate detail renders failed status and retry action.

Verification commands:

```bash
pnpm --filter @hr-copilot/api test
pnpm --filter @hr-copilot/api build
pnpm --filter @hr-copilot/web lint
pnpm --filter @hr-copilot/web build
```

## Manual Smoke Test

1. Set backend env:

```env
AI_PROVIDER=groq
GROQ_API_KEY=<real-key>
GROQ_MODEL=llama-3.3-70b-versatile
CV_STORAGE_DRIVER=local
```

2. Start local stack.
3. Submit a public application with a PDF or DOCX CV.
4. Confirm DB:

```sql
select "applicationId", status, summary from "CvParseResult" order by "updatedAt" desc limit 5;
select "applicationId", score from "MatchResult" order by "updatedAt" desc limit 5;
```

5. Open admin candidate detail.
6. Confirm AI status and match result are visible.
7. Force an invalid GROQ key and confirm failure is stored without breaking candidate submission.

## Deployment Notes

Render/backend environment must include:

```env
AI_PROVIDER=groq
GROQ_API_KEY=<secret>
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_TIMEOUT_MS=120000
```

If queue is used, also provision Redis and set `REDIS_URL`.

No local model container, GPU, or model files are required.

## Acceptance Criteria

- `main` can build without local model infrastructure.
- No local model provider SDK is added.
- `AI_PROVIDER=groq` processes uploaded CVs through GROQ API.
- Candidate application submission still succeeds if AI is disabled.
- Candidate application submission is not blocked by slow AI analysis when queue/background mode is enabled.
- `CvParseResult` records extraction/analysis status.
- `MatchResult` records deterministic score and arrays returned from validated GROQ analysis.
- Admin candidate API returns AI results.
- Admin UI displays AI result and failure state.
- GROQ secrets never appear in frontend code or logs.
