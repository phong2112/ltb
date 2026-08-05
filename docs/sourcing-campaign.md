# Sourcing Campaign Design

## Goal

Increase TA sourcing reach by helping the TA find, import, prioritize, and contact candidates who are likely to match an open JD.

The feature should increase both volume and quality:

- More potential candidates entering Talent Pool.
- Less manual time spent rewriting search queries.
- Faster shortlisting through JD matching.
- Higher outreach reply rate through personalized drafts.
- Clear tracking from sourced candidate to hiring goal.

## Core Workflow

1. TA selects a target job.
2. The system creates a sourcing brief from the JD.
3. The system generates search strings and candidate personas.
4. TA imports candidate data from approved sources, CSV, public profile links, or uploaded CVs.
5. The system parses available CV/profile text.
6. The system scores candidates against the JD.
7. TA reviews ranked candidates.
8. The system drafts outreach.
9. TA sends outreach manually or through an approved integration.
10. The system tracks replies, follow-ups, and funnel conversion.

## Sourcing Brief Output

Each sourcing brief should include:

- Target role summary.
- Must-have requirements.
- Nice-to-have requirements.
- Seniority indicators.
- Industry and domain signals.
- Location and work model constraints.
- Compensation or notice-period constraints when available.
- Positive keywords.
- Negative keywords.
- Boolean search strings.
- Candidate screening questions.

## Candidate Fit Model

Candidate ranking should combine:

- JD match score.
- Evidence confidence.
- Required requirement coverage.
- Missing requirement severity.
- Contact availability.
- Candidate source quality.
- Recent activity when available.
- TA review state.

AI output remains assistive. The system should not automatically reject a candidate.

## Supported Source Types

Source priority for the MVP:

1. LinkedIn assisted search and TA-provided profile URLs.
2. Existing Talent Pool entries.
3. GitHub and public portfolios.
4. Public web search.
5. ITviec and VietnamWorks.
6. Facebook public search.
7. GitLab and Stack Overflow.
8. CSV, referrals, and other manual sources.

LinkedIn is visually and operationally the primary source. The MVP generates LinkedIn People Search and public X-Ray queries plus GitHub, portfolio/public web, ITviec, VietnamWorks, Facebook, GitLab, and Stack Overflow queries. It opens results in one click and imports profile URLs in bulk with source-specific URL normalization and campaign-level deduplication. Restricted or authenticated pages should use assisted search, TA-provided links, or approved official integrations.

Initial source types:

- TA manual entry.
- TA CSV import.
- TA uploaded CV.
- Public portfolio URL.
- GitHub profile or repository URL.
- ITviec public URL.
- VietnamWorks public URL.
- Facebook public profile URL.
- GitLab profile URL.
- Stack Overflow user URL.
- Personal website.
- Referral note.
- Existing Talent Pool entry.

Future source types:

- Official job board or professional network APIs.
- Email inbox import through approved Gmail/Outlook integrations.
- Public web discovery adapters that respect robots.txt, rate limits, and source terms.

## Guardrails

The system should not:

- Bypass login, paywalls, CAPTCHAs, or access controls.
- Scrape private or semi-private pages.
- Store unnecessary personal data.
- Send outreach without TA review.
- Hide source origin from the TA.

The system should:

- Keep source URL and source label.
- Keep import timestamp.
- Keep source adapter configuration explicit and auditable.
- Show match reasons and uncertainty.
- Let TA delete sourced candidates.
- Avoid logging full CV contents or secrets.

## MVP Screens

`/admin/sourcing`

- Campaign list.
- Create campaign from job.
- Campaign KPI row.
- Candidate funnel table.
- Source and match filters.

`/admin/sourcing/:id`

- Sourcing brief.
- Search query generator.
- Import candidate action.
- Candidate ranking table.
- Outreach draft panel.
- Follow-up queue.

## Candidate Funnel Status

- `SOURCED`
- `QUALIFIED`
- `CONTACT_READY`
- `CONTACTED`
- `REPLIED`
- `INTERESTED`
- `SCREENING`
- `INTERVIEW`
- `OFFER`
- `HIRED`
- `REJECTED`
- `NOT_A_FIT`

## Success Metrics

- Number of sourced candidates per campaign.
- Percentage with match score above configured threshold.
- Average time from source to contact.
- Reply rate.
- Interested rate.
- Interview conversion rate.
- Offer conversion rate.
- Source-level quality and conversion.
