# Product Planning

This repository implements a lightweight TA Copilot and career site for one TA user. Keep the MVP focused on publishing jobs, receiving applications, protecting and parsing CVs, matching candidates, sourcing candidates from a JD, and helping TA follow up.

## Current Priority: Reliable JD Sourcing

The sourcing flow is retrieval-first and human-in-the-loop:

1. Create a campaign from a job and snapshot its sourcing brief and manual queries.
2. Queue a background run that refreshes the snapshot from the current JD.
3. Search internal candidates and, when configured, public LinkedIn results through Brave Search.
4. Normalize and deduplicate profiles, calculate versioned potential-fit evidence, and persist results.
5. Require TA review, capture relevance feedback separately from funnel status, and use labeled precision/coverage before tuning score weights.

Campaigns may be active, paused, or closed. Only active campaigns may start automatic discovery. AI query planning is optional and must fall back to deterministic JD queries.

## Next Quality Milestones

- Export an anonymized evaluation set after enough TA relevance labels have been collected, then calibrate ranking weights against it.
- Replace cursor-paginated internal scans with indexed structured retrieval when internal volume requires it.
- Add operational metrics for queue latency and provider degradation; interrupted runs are already recovered on startup.
- Revisit retention only if new raw sourcing evidence is persisted; public snippets and CV-derived excerpts are not duplicated into new sourcing notes.

Do not expand sourcing into automated outreach or an enterprise ATS without an explicit product decision.
