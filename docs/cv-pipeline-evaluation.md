# CV pipeline evaluation

The manual evaluation harness measures extraction and optional Ollama matching
against fictional CV fixtures. It is intentionally excluded from CI because
OCR is CPU-intensive and matching requires a running Ollama model.

Regenerate the synthetic fixtures when their source changes:

```bash
pnpm --filter @hr-copilot/api eval:cv:fixtures
```

Run extraction-only evaluation:

```bash
AI_PROVIDER=disabled pnpm --filter @hr-copilot/api eval:cv
```

Run the full extraction and matching evaluation after starting Redis/Ollama and
configuring `OLLAMA_BASE_URL` and `OLLAMA_MODEL`:

```bash
AI_PROVIDER=ollama pnpm --filter @hr-copilot/api eval:cv
```

The result table reports parser selection, extracted characters, OCR
confidence, page truncation, contact/name detection, criterion coverage, score,
and elapsed time. A non-zero exit code means at least one expectation failed.

Fixtures live in `apps/api/test/fixtures/cv-eval`. They must remain fictional;
never copy a real candidate CV into the repository.

For operational investigation, `/health` exposes process-lifetime completion
and final-failure counters for `cv-extraction` and `ai-cv-match`. The database
remains the durable dead-letter view. Recent failures can be queried with:

```sql
SELECT "applicationId", status, "errorMessage", "updatedAt"
FROM "CvParseResult"
WHERE status = 'FAILED'
ORDER BY "updatedAt" DESC
LIMIT 100;
```
