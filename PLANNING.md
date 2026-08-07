# Product Planning

## Product Direction

TA Copilot is a lightweight recruiting workspace for one TA user. The product helps the TA publish jobs, receive applications, manage candidate data, parse CVs, match candidates against JDs, and run outbound sourcing campaigns.

Sourcing is a core product capability. The product should help TA teams increase the number and quality of potential applicants while reducing manual search, screening, and outreach time.

## MVP Scope

The MVP remains focused on practical TA workflows:

- Publish jobs and collect inbound applications.
- Upload, store, parse, and protect CV files.
- Match CVs and candidate profiles against JDs.
- Maintain a Talent Pool for sourced and uploaded candidates.
- Run sourcing campaigns for priority jobs.
- Draft personalized outreach and follow-up messages.
- Track sourced candidate status and conversion goals.

The MVP is not an enterprise ATS. Avoid enterprise-only complexity unless it directly supports sourcing quality, candidate review speed, data safety, or measurable hiring conversion.

## Sourcing Campaign Scope

A sourcing campaign starts from a published or draft job and produces a structured workflow:

1. Generate a sourcing brief from the JD.
2. Generate multi-platform search queries with LinkedIn as the highest-priority discovery path.
3. Let the TA import candidate links, public profile data, CSV rows, or CV files.
4. Parse CVs and profile text where provided by the TA or obtained from compliant public sources.
5. Match each candidate against the JD using grounded evidence.
6. Rank candidates by fit, freshness, source quality, and contact readiness.
7. Draft personalized outreach and follow-up messages.
8. Track funnel status from sourced to contacted, replied, screened, interviewed, offered, or rejected.

## Public Web Discovery Rules

The product may support public web discovery when it is implemented with explicit safety controls:

- Use official APIs when available.
- Respect robots.txt, rate limits, and site terms.
- Store source URL, fetched timestamp, and extraction method.
- Allow TA review before outreach.
- Avoid collecting unnecessary personal data.
- Avoid bypassing login, paywalls, CAPTCHAs, technical protections, or access controls.
- Configure each source adapter explicitly so the TA can enable, disable, throttle, and audit it.
- Prefer TA-provided links/files and official integrations for restricted or authenticated platforms.

## Source Priority

LinkedIn is the primary sourcing channel. The product may also support GitHub, public portfolio search, ITviec, VietnamWorks, Facebook, GitLab, Stack Overflow, referrals, and manual sources when each source is explicit, reviewable, and auditable. For restricted or authenticated platforms, the product should prefer assisted search, TA-provided links, or official integrations unless a compliant adapter is approved.

Default source order:

1. LinkedIn.
2. Existing Talent Pool and previous applications.
3. GitHub and public portfolios.
4. Public web search.
5. ITviec and VietnamWorks.
6. Facebook public search.
7. GitLab and Stack Overflow.
8. CSV, referrals, and other manual sources.

This project should not implement unrestricted internet scraping. Public discovery must be narrow, auditable, and configurable per source.

## Candidate Data Rules

Sourced candidate data is sensitive personal data. Store only data needed for recruiting operations:

- Name.
- Contact method when available from a legitimate source or provided by TA.
- Public profile or portfolio URL.
- Source URL and source label.
- CV file metadata.
- Parsed profile summary.
- JD match result.
- Outreach state and activity log.

Do not store full raw pages by default. Prefer extracted, bounded, reviewable candidate profile fields. Store raw CV text only where already required by parsing and audit workflows.

## Sourcing Metrics

Campaigns should measure:

- Sourced candidates.
- Qualified candidates.
- Match score distribution.
- Contact-ready candidates.
- Contacted candidates.
- Reply rate.
- Interested rate.
- Screening pass rate.
- Interview conversion.
- Source quality by channel.
- Time saved versus manual review.

## Implementation Priorities

1. Add campaign data models for sourcing campaigns, sourced profiles, candidate-source links, and campaign funnel status.
2. Add admin UI for `/admin/sourcing`.
3. Generate multi-platform sourcing briefs and search queries from JD data with LinkedIn priority.
4. Add deduplicated profile URL import by source, then manual candidate and CSV import into Talent Pool.
5. Connect Talent Pool entries to one or more target jobs for matching.
6. Add outreach draft generation and copy-to-send actions.
7. Add compliant public web discovery adapters only after the campaign workflow and audit model are in place.
