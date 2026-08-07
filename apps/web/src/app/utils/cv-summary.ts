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

export function formatWorkExperience(item: WorkExperienceDisplayItem) {
  return `${item.company}: ${item.title || "—"} - ${item.duration || "—"}`;
}

function findCompanyHighlight(company: string, highlights: string[]) {
  const normalizedCompany = company.toLowerCase();
  return highlights.find(item => item.toLowerCase().includes(normalizedCompany));
}

function inferCompany(value?: string) {
  if (!value) return null;
  const match = value.match(/(?:\bat\b|\b@|\btại\b|\bở\b)\s+([^,.;|()]+)/iu);
  return cleanNullable(match?.[1]);
}

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

function inferDuration(value?: string) {
  if (!value) return null;
  const dateRange = value.match(/((?:\d{1,2}[/-])?\d{4}\s*(?:-|–|—|to|đến)\s*(?:(?:\d{1,2}[/-])?\d{4}|present|current|nay|hiện tại))/iu)?.[1];
  if (dateRange) return cleanNullable(dateRange);
  return cleanNullable(value.match(/(\d+(?:[.,]\d+)?\+?\s*(?:năm|years?|yrs?))/iu)?.[1]);
}

function stripLeadingRoleWords(value: string) {
  return value.replace(/^(?:as|a|an|vị trí|chức danh)\s+/iu, "").trim();
}

function cleanNullable(value?: string | null) {
  const cleaned = value?.replace(/\s+/gu, " ").trim();
  return cleaned || null;
}

function uniqueExperiences(items: WorkExperienceDisplayItem[]) {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = `${item.company}|${item.title ?? ""}|${item.duration ?? ""}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
