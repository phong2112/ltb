type CvSummaryLike = {
  currentTitle?: string | null;
  workExperiences?: Array<{
    company: string;
    title?: string | null;
    duration?: string | null;
  }>;
  workCompanies?: string[];
  workHighlights?: string[];
};

export type WorkExperienceDisplayItem = {
  company: string;
  title: string | null;
  duration: string | null;
};

/** Builds display-ready work history from the best available CV summary fields. */
export function getWorkExperienceItems(summary: CvSummaryLike): WorkExperienceDisplayItem[] {
  const structured = (summary.workExperiences ?? [])
    .map(item => ({
      company: item.company?.trim(),
      title: cleanNullable(item.title),
      duration: cleanNullable(item.duration),
    }))
    .filter((item): item is WorkExperienceDisplayItem => Boolean(item.company));

  if (structured.length) return uniqueExperiences(structured);

  const companies = Array.from(new Set((summary.workCompanies ?? []).map(item => item.trim()).filter(Boolean)));
  if (companies.length) {
    return companies.map(company => {
      const highlight = findCompanyHighlight(company, summary.workHighlights ?? []);
      return {
        company,
        title: inferTitle(company, highlight) ?? null,
        duration: inferDuration(highlight) ?? null,
      };
    });
  }

  return uniqueExperiences(
    (summary.workHighlights ?? [])
      .map(highlight => {
        const company = inferCompany(highlight);
        if (!company) return null;
        return {
          company,
          title: inferTitle(company, highlight) ?? cleanNullable(summary.currentTitle),
          duration: inferDuration(highlight) ?? null,
        };
      })
      .filter((item): item is WorkExperienceDisplayItem => Boolean(item)),
  );
}

/** Formats one work experience row for compact table/list display. */
export function formatWorkExperience(item: WorkExperienceDisplayItem) {
  return `${item.company}: ${item.title || "—"} - ${item.duration || "—"}`;
}

/** Finds the free-text highlight that mentions a known company. */
function findCompanyHighlight(company: string, highlights: string[]) {
  const normalizedCompany = company.toLowerCase();
  return highlights.find(item => item.toLowerCase().includes(normalizedCompany));
}

/** Infers a company name from phrases like "at X" or "tại X" when structured data is missing. */
function inferCompany(value?: string) {
  if (!value) return null;
  const match = value.match(/(?:\bat\b|\b@|\btại\b|\bở\b)\s+([^,.;|()]+)/iu);
  return cleanNullable(match?.[1]);
}

/** Infers a role/title that appears before the company mention in a highlight sentence. */
function inferTitle(company: string, value?: string) {
  if (!value) return null;
  const escapedCompany = escapeRegExp(company);
  const beforeCompanyPatterns = [
    new RegExp(`(?:làm|worked as|vai trò|role)\\s+(.{2,80}?)\\s+(?:tại|ở|at|@)\\s+${escapedCompany}`, "iu"),
    new RegExp(`^(.{2,80}?)\\s+(?:tại|ở|at|@)\\s+${escapedCompany}`, "iu"),
  ];
  for (const pattern of beforeCompanyPatterns) {
    const matched = cleanNullable(value.match(pattern)?.[1]);
    if (matched) return stripLeadingRoleWords(matched);
  }
  return null;
}

/** Extracts either a date range or rough tenure from a work highlight. */
function inferDuration(value?: string) {
  if (!value) return null;
  const dateRange = value.match(/((?:\d{1,2}[/-])?\d{4}\s*(?:-|–|—|to|đến)\s*(?:(?:\d{1,2}[/-])?\d{4}|present|current|nay|hiện tại))/iu)?.[1];
  if (dateRange) return cleanNullable(dateRange);
  return cleanNullable(value.match(/(\d+(?:[.,]\d+)?\+?\s*(?:năm|years?|yrs?))/iu)?.[1]);
}

/** Removes filler words that often appear before an inferred role. */
function stripLeadingRoleWords(value: string) {
  return value.replace(/^(?:as|a|an|vị trí|chức danh)\s+/iu, "").trim();
}

/** Normalizes optional strings and converts blank values to null for UI consistency. */
function cleanNullable(value?: string | null) {
  const cleaned = value?.replace(/\s+/gu, " ").trim();
  return cleaned || null;
}

/** Removes duplicate work experience rows after fallback inference. */
function uniqueExperiences(items: WorkExperienceDisplayItem[]) {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = `${item.company}|${item.title ?? ""}|${item.duration ?? ""}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Escapes user/company text before embedding it inside a RegExp. */
function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
