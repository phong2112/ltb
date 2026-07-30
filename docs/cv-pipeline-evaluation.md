# CV OCR, Extraction, And AI Matching

## Runtime flow

```text
private CV file
  -> cv-extraction queue
  -> PDF/DOC/DOCX parser or local vie+eng OCR
  -> normalized extracted text + quality metadata (stored for audit)
  -> AI-safe text: normalize, remove hidden characters, redact known PII,
     remove OCR noise, then build a criteria-curated evidence pack
  -> ai-cv-match queue
  -> model classifies each JD criterion with verbatim CV evidence
  -> API verifies criterion IDs and evidence against the AI-safe CV text
  -> deterministic score, confidence, strengths, risks, missing requirements,
     and screening questions
  -> candidate review UI
```

The stored `CvParseResult.extractedText` remains separate from the AI-safe
payload. This allows manual review and reprocessing without persisting a second
redacted copy. Logs and activity metadata contain counts and versions, never the
full CV or AI payload.

## Extraction decisions

- Text PDFs use `pdf-parse`.
- PDFs with too little text, low text density, or suspicious control characters
  also run through Tesseract.
- A hybrid PDF chooses OCR only when OCR is materially cleaner or substantially
  more complete without a material quality loss. Length alone is not sufficient.
- DOCX uses Mammoth, legacy DOC uses `word-extractor`, and JPG/PNG use Tesseract.
- OCR is capped by `OCR_MAX_PAGES`, `OCR_TIMEOUT_MS`, and the 30-page hard limit.
- `qualityScore`, OCR confidence, truncation, parser, and extraction version are
  stored in `structuredData`.

## Data sent to AI

Before matching, the API:

- normalizes Unicode, line endings, hidden/control characters, soft hyphens, and
  common line-break hyphenation;
- redacts email, phone, URL, labeled address/DOB/gender/marital/nationality
  lines, and the known submitted candidate name;
- removes adjacent duplicate lines, repeated page/footer noise, symbol-only OCR
  artifacts, and redaction-marker lines from the matching payload;
- sections the CV into profile/summary/skills/experience/projects/education/
  certifications/languages where headings are detectable;
- builds a `criteria_curated_pack` containing priority CV sections plus up to
  two evidence-candidate snippets per JD criterion;
- limits the final payload to 45,000 characters while retaining both the
  beginning and end if the curated pack is still too long;
- marks the JD and CV as untrusted data in the prompt to reduce prompt-injection
  risk.

The goal is to send the model less raw CV bulk and more directly relevant,
low-noise evidence. `structuredData.aiInput` records source, cleaned, selected,
and omitted character counts, selected section names, redaction count, strategy,
and criterion snippet count.

Talent-pool profile extraction keeps the candidate name because that operation
must extract it, but still redacts contact and labeled sensitive data. Matching
does not need the candidate identity and redacts the known submitted name.

## Score and analysis semantics

- The model does not return the final score.
- Each criterion is classified as `met`, `partial`, `not_met`, or `unknown`.
- A known status must contain evidence that can be found in the CV payload.
  Otherwise the API downgrades it to `unknown`.
- Each extracted criterion carries an `importance` and a `constraintType`.
  `importance` is `critical`, `required`, or `preferred`; `constraintType` is
  `quantitative`, `hard_skill`, `soft_skill`, `domain`, or `general`.
- Critical criteria have weight 4, required criteria have weight 2, and
  preferred criteria have weight 1.
- `met = 1`, `partial = 0.5`, and `not_met/unknown = 0`.
- `confirmedScore` is therefore conservative. `potentialScore` in
  `structuredData.scoreBreakdown` shows the upper bound if all unknown criteria
  were later confirmed.
- A missing or unknown critical blocker caps the score at 55. A partial critical
  blocker caps the score at 75. Missing ordinary required criteria also cap
  otherwise high scores, so small preferred matches cannot hide major gaps.
- A partial quantitative required criterion, such as unclear evidence for
  required years of experience, caps the score at 85 even when other criteria are
  strong.
- Alternative requirements using "or"/"hoặc" should be treated as satisfied
  when one listed option is clearly evidenced, for example Selenium satisfying
  "Playwright, Cypress hoặc Selenium".
- `evidenceCoverage` measures the weighted share of criteria with a verified
  status. Displayed `confidence` additionally discounts low-confidence or
  truncated OCR/input.
- Strengths are derived only from verified `met` criteria.
- Risks are required criteria with verified `partial` or `not_met` status.
- Missing requirements contain only required gaps; optional gaps are not shown
  as mandatory deficiencies.
- Screening questions are generated from unresolved required criteria.

AI results are decision support. They must not automatically reject a candidate.

## Evaluation

Generate the fictional test fixtures:

```bash
pnpm --filter @hr-copilot/api eval:cv:fixtures
```

Run extraction-only evaluation:

```bash
AI_PROVIDER=disabled pnpm --filter @hr-copilot/api eval:cv
```

Run the end-to-end evaluation with Groq configured:

```bash
AI_PROVIDER=groq pnpm --filter @hr-copilot/api eval:cv
```

Run prompt/output checks against local uploaded CVs without printing raw CV text:

```bash
AI_PROVIDER=groq EVAL_ALLOW_EXTERNAL_AI=true pnpm --filter @hr-copilot/api eval:uploads
```

Optional filters:

```bash
AI_PROVIDER=groq EVAL_ALLOW_EXTERNAL_AI=true EVAL_FILE_MATCH=Nguyen-Quan EVAL_JOB_LIMIT=2 pnpm --filter @hr-copilot/api eval:uploads
```

Only set `EVAL_ALLOW_EXTERNAL_AI=true` for CVs that may be sent to the
configured provider. The script prints scores and criterion statuses, not raw CV
text.

For rate-limited providers, add a delay and bounded retries:

```bash
AI_PROVIDER=groq EVAL_ALLOW_EXTERNAL_AI=true EVAL_REQUEST_DELAY_MS=65000 EVAL_MAX_QUOTA_RETRIES=3 pnpm --filter @hr-copilot/api eval:uploads
```

The current fixture harness checks parser selection, minimum readable text,
contact/name survival in stored extraction text, OCR truncation, and criterion
coverage. Production calibration should add a reviewed set of anonymized CV/JD
pairs and compare criterion precision/recall, score stability across repeated
runs, false evidence rate, and OCR character/word error rate.
