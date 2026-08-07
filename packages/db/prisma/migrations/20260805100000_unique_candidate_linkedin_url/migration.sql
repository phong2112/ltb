ALTER TABLE "Candidate" ADD COLUMN "normalizedLinkedinUrl" TEXT;
ALTER TABLE "Application" ADD COLUMN "normalizedLinkedinUrl" TEXT;

WITH normalized_candidates AS (
  SELECT
    id,
    lower(
      regexp_replace(
        regexp_replace(
          regexp_replace("linkedinUrl", '^https?://(www\.|m\.)?', 'https://'),
          '[?#].*$',
          ''
        ),
        '/$',
        ''
      )
    ) AS normalized_url
  FROM "Candidate"
  WHERE "linkedinUrl" IS NOT NULL AND trim("linkedinUrl") <> ''
),
ranked_candidates AS (
  SELECT id, normalized_url, row_number() OVER (PARTITION BY normalized_url ORDER BY id) AS rn
  FROM normalized_candidates
  WHERE normalized_url LIKE 'https://linkedin.com/in/%'
     OR normalized_url LIKE 'https://linkedin.com/pub/%'
     OR normalized_url LIKE 'https://www.linkedin.com/in/%'
     OR normalized_url LIKE 'https://www.linkedin.com/pub/%'
)
UPDATE "Candidate" c
SET "normalizedLinkedinUrl" = replace(r.normalized_url, 'https://linkedin.com/', 'https://www.linkedin.com/')
FROM ranked_candidates r
WHERE c.id = r.id AND r.rn = 1;

WITH normalized_applications AS (
  SELECT
    id,
    "jobId",
    lower(
      regexp_replace(
        regexp_replace(
          regexp_replace("submittedLinkedinUrl", '^https?://(www\.|m\.)?', 'https://'),
          '[?#].*$',
          ''
        ),
        '/$',
        ''
      )
    ) AS normalized_url
  FROM "Application"
  WHERE "submittedLinkedinUrl" IS NOT NULL AND trim("submittedLinkedinUrl") <> ''
),
ranked_applications AS (
  SELECT id, normalized_url, row_number() OVER (PARTITION BY "jobId", normalized_url ORDER BY id) AS rn
  FROM normalized_applications
  WHERE normalized_url LIKE 'https://linkedin.com/in/%'
     OR normalized_url LIKE 'https://linkedin.com/pub/%'
     OR normalized_url LIKE 'https://www.linkedin.com/in/%'
     OR normalized_url LIKE 'https://www.linkedin.com/pub/%'
)
UPDATE "Application" a
SET "normalizedLinkedinUrl" = replace(r.normalized_url, 'https://linkedin.com/', 'https://www.linkedin.com/')
FROM ranked_applications r
WHERE a.id = r.id AND r.rn = 1;

CREATE UNIQUE INDEX "Candidate_normalizedLinkedinUrl_unique_not_null" ON "Candidate"("normalizedLinkedinUrl") WHERE "normalizedLinkedinUrl" IS NOT NULL;
CREATE INDEX "Candidate_normalizedLinkedinUrl_idx" ON "Candidate"("normalizedLinkedinUrl");
CREATE UNIQUE INDEX "Application_jobId_normalizedLinkedinUrl_key" ON "Application"("jobId", "normalizedLinkedinUrl");
