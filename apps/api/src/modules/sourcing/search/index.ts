export type SourcingJobInput = {
  title: string;
  company?: string | null;
  department?: string | null;
  locations: string[];
  level?: string | null;
  tags: string[];
  description: string;
  requirements: string;
};

export type SourcingSearchQuery = {
  id: string;
  source: SourcingSearchSource;
  type: "PEOPLE" | "BROAD" | "XRAY" | "REPOSITORY" | "JOB_BOARD" | "SOCIAL" | "WEB";
  label: string;
  query: string;
  searchUrl: string;
  priority: number;
};

export type SourcingSearchSource =
  | "LINKEDIN"
  | "GITHUB"
  | "PUBLIC_WEB"
  | "FACEBOOK"
  | "ITVIEC"
  | "VIETNAMWORKS"
  | "GITLAB"
  | "STACK_OVERFLOW";

export type SourcingImportSource = SourcingSearchSource | "MANUAL" | "REFERRAL";

export type SourcingDiscoveryLocationScope = "VIETNAM" | "GLOBAL";

export type SourcingDiscoveryEnhancements = {
  titleVariants?: string[];
  skillSignals?: string[];
};

const TITLE_EQUIVALENTS: Array<[RegExp, string[]]> = [
  [/software engineer|software developer/iu, ["Software Engineer", "Software Developer"]],
  [/business analyst|analystic|\bba\b/iu, ["Business Analyst", "BA", "Product Owner", "System Analyst"]],
  [/frontend|front-end/iu, ["Frontend Engineer", "Frontend Developer", "Web Developer"]],
  [/backend|back-end/iu, ["Backend Engineer", "Backend Developer", "Software Engineer"]],
  [/full.?stack/iu, ["Full Stack Engineer", "Full Stack Developer", "Software Engineer"]],
  [/recruit|talent acquisition|\bta\b/iu, ["Talent Acquisition", "Recruiter", "Talent Partner"]],
  [/product designer|ui.?ux/iu, ["Product Designer", "UI UX Designer", "UX Designer"]],
  [/data engineer/iu, ["Data Engineer", "Analytics Engineer", "Data Platform Engineer"]],
  [/ai engineer|machine learning/iu, ["AI Engineer", "Machine Learning Engineer", "ML Engineer"]],
];

export function buildSourcingBrief(job: SourcingJobInput) {
  const requirements = splitRequirements(job.requirements);

  return {
    targetRole: job.title,
    seniority: job.level || null,
    locations: job.locations,
    mustHave: requirements.slice(0, 8),
    skills: unique(job.tags.map(cleanPhrase).filter(Boolean)).slice(0, 10),
    titleVariants: titleVariants(job.title),
    sourcePriority: [
      "LINKEDIN",
      "TALENT_POOL",
      "GITHUB",
      "PUBLIC_WEB",
      "ITVIEC",
      "VIETNAMWORKS",
      "FACEBOOK",
      "GITLAB",
      "STACK_OVERFLOW",
      "REFERRAL",
    ],
  };
}

export function buildSourcingQueries(job: SourcingJobInput): SourcingSearchQuery[] {
  const titles = titleVariants(job.title);
  const skills = unique(job.tags.map(cleanPhrase).filter(Boolean)).slice(0, 6);
  const locations = unique(job.locations.map(cleanPhrase).filter(Boolean)).slice(0, 3);
  const titleClause = orClause(titles);
  const skillClause = skills.length ? ` AND ${orClause(skills)}` : "";
  const locationClause = locations.length ? ` AND ${orClause(locations)}` : "";
  const coreQuery = `${titleClause}${skillClause}${locationClause}`;
  const broadQuery = `${titleClause}${skillClause}`;
  const linkedinXrayQuery = `site:linkedin.com/in ${titleClause}${skillClause}${locationClause} -jobs -company`;
  const githubQuery = `site:github.com ${titleClause}${skillClause}${locationClause} -jobs -topics -marketplace`;
  const portfolioQuery = `${titleClause}${skillClause}${locationClause} (portfolio OR "personal website" OR "about me")`;
  const itviecQuery = `site:itviec.com ${titleClause}${skillClause}${locationClause}`;
  const vietnamWorksQuery = `site:vietnamworks.com ${titleClause}${skillClause}${locationClause}`;
  const facebookQuery = `site:facebook.com ${titleClause}${skillClause}${locationClause} (developer OR engineer OR tuyển OR profile)`;
  const gitlabQuery = `site:gitlab.com ${titleClause}${skillClause}`;
  const stackOverflowQuery = `site:stackoverflow.com/users ${titleClause}${skillClause}`;

  return [
    {
      id: "linkedin-core",
      source: "LINKEDIN",
      type: "PEOPLE",
      label: "LinkedIn · Chính xác nhất",
      query: coreQuery,
      searchUrl: linkedinPeopleSearchUrl(coreQuery),
      priority: 1,
    },
    {
      id: "linkedin-broad",
      source: "LINKEDIN",
      type: "BROAD",
      label: "LinkedIn · Mở rộng địa điểm",
      query: broadQuery,
      searchUrl: linkedinPeopleSearchUrl(broadQuery),
      priority: 2,
    },
    {
      id: "linkedin-title",
      source: "LINKEDIN",
      type: "BROAD",
      label: "LinkedIn · Theo chức danh tương đương",
      query: titleClause,
      searchUrl: linkedinPeopleSearchUrl(titleClause),
      priority: 3,
    },
    {
      id: "linkedin-xray",
      source: "LINKEDIN",
      type: "XRAY",
      label: "LinkedIn · X-Ray công khai",
      query: linkedinXrayQuery,
      searchUrl: googleSearchUrl(linkedinXrayQuery),
      priority: 4,
    },
    {
      id: "github-xray",
      source: "GITHUB",
      type: "REPOSITORY",
      label: "GitHub · Profile & repo signal",
      query: githubQuery,
      searchUrl: googleSearchUrl(githubQuery),
      priority: 5,
    },
    {
      id: "public-portfolio",
      source: "PUBLIC_WEB",
      type: "WEB",
      label: "Public web · Portfolio",
      query: portfolioQuery,
      searchUrl: googleSearchUrl(portfolioQuery),
      priority: 6,
    },
    {
      id: "itviec-xray",
      source: "ITVIEC",
      type: "JOB_BOARD",
      label: "ITviec · Public search",
      query: itviecQuery,
      searchUrl: googleSearchUrl(itviecQuery),
      priority: 7,
    },
    {
      id: "vietnamworks-xray",
      source: "VIETNAMWORKS",
      type: "JOB_BOARD",
      label: "VietnamWorks · Public search",
      query: vietnamWorksQuery,
      searchUrl: googleSearchUrl(vietnamWorksQuery),
      priority: 8,
    },
    {
      id: "facebook-xray",
      source: "FACEBOOK",
      type: "SOCIAL",
      label: "Facebook · Public search",
      query: facebookQuery,
      searchUrl: googleSearchUrl(facebookQuery),
      priority: 9,
    },
    {
      id: "gitlab-xray",
      source: "GITLAB",
      type: "REPOSITORY",
      label: "GitLab · Public profiles",
      query: gitlabQuery,
      searchUrl: googleSearchUrl(gitlabQuery),
      priority: 10,
    },
    {
      id: "stackoverflow-xray",
      source: "STACK_OVERFLOW",
      type: "WEB",
      label: "Stack Overflow · Public users",
      query: stackOverflowQuery,
      searchUrl: googleSearchUrl(stackOverflowQuery),
      priority: 11,
    },
  ];
}

export const buildLinkedinQueries = buildSourcingQueries;

export function buildLinkedinDiscoveryQueries(
  job: SourcingJobInput,
  options: {
    locationScope?: SourcingDiscoveryLocationScope;
    enhancements?: SourcingDiscoveryEnhancements;
  } = {},
): SourcingSearchQuery[] {
  const titles = unique([
    ...titleVariants(job.title),
    ...(options.enhancements?.titleVariants ?? []).map(cleanPhrase).filter(Boolean),
  ]).slice(0, 10);
  const skills = unique([
    ...job.tags.map(cleanPhrase).filter(Boolean),
    ...(options.enhancements?.skillSignals ?? []).map(cleanPhrase).filter(Boolean),
  ]).slice(0, 12);
  const locations = unique(job.locations.map(cleanPhrase).filter(Boolean)).slice(0, 4);
  const seniority = cleanPhrase(job.level ?? "");
  const mustHave = splitRequirements(job.requirements).map(cleanPhrase).filter(Boolean).slice(0, 6);
  const discoveryTerms = unique([
    ...skills,
    ...extractDiscoveryKeywordSignals(`${job.requirements}\n${job.description}`),
    ...mustHave,
  ]).slice(0, 12);
  const skillGroups = groupDiscoveryTerms(discoveryTerms, 3).filter((group) => group.length);
  const locationClause = discoveryLocationClause(locations, options.locationScope ?? "VIETNAM");
  const titleClause = orClause(titles);
  const adjacentTitleClause = orClause(unique([...titles, ...adjacentTitleVariants(job.title)]));
  const seniorityClause = seniority ? ` ${quote(seniority)}` : "";
  const baseNegative = "-jobs -job -company -pulse -school -learning";
  const queries: SourcingSearchQuery[] = [];

  pushLinkedinDiscoveryQuery(queries, "linkedin-discovery-strict", "LinkedIn · Auto strict", `${titleClause}${seniorityClause}${skillGroups[0] ? ` ${orClause(skillGroups[0])}` : ""}${locationClause} ${baseNegative}`);
  pushLinkedinDiscoveryQuery(queries, "linkedin-discovery-skill-first", "LinkedIn · Auto skill-first", `${skillGroups[0] ? orClause(skillGroups[0]) : titleClause} ${adjacentTitleClause}${locationClause} ${baseNegative}`);
  pushLinkedinDiscoveryQuery(queries, "linkedin-discovery-adjacent-title", "LinkedIn · Auto title mở rộng", `${adjacentTitleClause}${skillGroups[1] ? ` ${orClause(skillGroups[1])}` : ""}${locationClause} ${baseNegative}`);
  pushLinkedinDiscoveryQuery(queries, "linkedin-discovery-location-broad", "LinkedIn · Auto rộng địa điểm", `${titleClause}${skillGroups[0] ? ` ${orClause(skillGroups[0])}` : ""} ${baseNegative}`);
  pushLinkedinDiscoveryQuery(queries, "linkedin-discovery-hidden-gem", "LinkedIn · Auto hidden gems", `${skillGroups.flat().slice(0, 5).map(quote).join(" ")}${locationClause} ${baseNegative}`);

  skillGroups.slice(0, 4).forEach((group, index) => {
    pushLinkedinDiscoveryQuery(
      queries,
      `linkedin-discovery-skill-group-${index + 1}`,
      `LinkedIn · Auto skill group ${index + 1}`,
      `${adjacentTitleClause} ${orClause(group)}${locationClause} ${baseNegative}`,
    );
  });

  return queries.map((query, index) => ({ ...query, priority: index + 1 }));
}

export function normalizeSourcingProfileUrl(value: string, source: SourcingImportSource) {
  const raw = value.trim();
  if (!raw) return null;

  let parsed: URL;
  try {
    parsed = new URL(/^https?:\/\//iu.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^www\./u, "").replace(/^m\./u, "");
  const path = normalizedPath(parsed);

  if (source === "LINKEDIN") return normalizeLinkedinParsedUrl(hostname, path);
  if (source === "GITHUB") return normalizeHostPathUrl(hostname, path, ["github.com"], isGithubProfilePath);
  if (source === "GITLAB") return normalizeHostPathUrl(hostname, path, ["gitlab.com"], isSingleSegmentPath);
  if (source === "STACK_OVERFLOW") return normalizeHostPathUrl(hostname, path, ["stackoverflow.com"], isStackOverflowUserPath);
  if (source === "FACEBOOK") {
    return normalizeHostPathUrl(hostname, path, ["facebook.com", "fb.com"], (parts) => parts.length >= 1, cleanedSearch(parsed));
  }
  if (source === "ITVIEC") return normalizeHostPathUrl(hostname, path, ["itviec.com"], (parts) => parts.length >= 1);
  if (source === "VIETNAMWORKS") return normalizeHostPathUrl(hostname, path, ["vietnamworks.com"], (parts) => parts.length >= 1);
  if (source === "PUBLIC_WEB" || source === "MANUAL" || source === "REFERRAL") {
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return `https://${hostname}/${path.join("/")}${cleanedSearch(parsed)}`.replace(/\/$/u, "");
  }
  return null;
}

export function normalizeLinkedinProfileUrl(value: string) {
  return normalizeSourcingProfileUrl(value, "LINKEDIN");
}

function normalizeLinkedinParsedUrl(hostname: string, parts: string[]) {
  if (hostname !== "linkedin.com") return null;
  if (!parts.length || !["in", "pub"].includes(parts[0].toLowerCase()) || parts.length < 2) return null;

  return `https://www.linkedin.com/${parts.join("/")}`;
}

function linkedinPeopleSearchUrl(query: string) {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`;
}

function googleSearchUrl(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function pushLinkedinDiscoveryQuery(queries: SourcingSearchQuery[], id: string, label: string, body: string) {
  const normalizedBody = body.replace(/\s+/gu, " ").trim();
  if (!normalizedBody) return;
  queries.push({
    id,
    source: "LINKEDIN",
    type: "XRAY",
    label,
    query: `site:linkedin.com/in ${normalizedBody}`,
    searchUrl: googleSearchUrl(`site:linkedin.com/in ${normalizedBody}`),
    priority: queries.length + 1,
  });
}

function adjacentTitleVariants(title: string) {
  if (/business analyst|analystic|\bba\b/iu.test(title)) return ["Business Analyst", "BA", "Product Owner", "System Analyst"];
  if (/tester|qa|quality/iu.test(title)) return ["QA Engineer", "Quality Assurance", "Automation Tester", "SDET", "Test Engineer"];
  if (/frontend|front-end/iu.test(title)) return ["Frontend Engineer", "Frontend Developer", "React Developer", "Web Developer"];
  if (/backend|back-end/iu.test(title)) return ["Backend Engineer", "Backend Developer", "Software Engineer", "API Developer"];
  if (/full.?stack/iu.test(title)) return ["Full Stack Engineer", "Full Stack Developer", "Software Engineer", "Web Developer"];
  if (/ai|machine learning|\bml\b/iu.test(title)) return ["AI Engineer", "Machine Learning Engineer", "ML Engineer", "Data Scientist"];
  if (/recruit|talent acquisition|\bta\b/iu.test(title)) return ["Recruiter", "Talent Acquisition", "Talent Partner", "Technical Recruiter"];
  return [];
}

function groupDiscoveryTerms<T>(values: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function discoveryLocationClause(locations: string[], scope: SourcingDiscoveryLocationScope) {
  if (scope === "GLOBAL") return "";
  return ` ${locations.length ? orClause([...expandLocationTerms(locations), "Vietnam", "Viet Nam"]) : orClause(["Vietnam", "Viet Nam"])}`;
}

function expandLocationTerms(locations: string[]) {
  const expanded = [...locations];
  for (const location of locations) {
    const normalized = stripDiacritics(location).toLowerCase();
    if (normalized.includes("ha noi") || normalized.includes("hanoi")) expanded.push("Hanoi", "Ha Noi");
    if (normalized.includes("ho chi minh") || normalized.includes("hcm")) expanded.push("Ho Chi Minh", "HCMC", "Saigon");
    if (normalized.includes("da nang") || normalized.includes("danang")) expanded.push("Da Nang", "Danang");
  }
  return unique(expanded);
}

function extractDiscoveryKeywordSignals(value: string) {
  const text = plainText(value);
  const catalog = [
    "Jira",
    "Confluence",
    "Figma",
    "Visio",
    "Bizagi",
    "Lucidchart",
    "Agile",
    "Scrum",
    "Waterfall",
    "SQL",
    "UAT",
    "API",
    "Playwright",
    "Selenium",
    "React",
    "Vue",
    "Angular",
    "Node.js",
    "Java",
    "Python",
    "LLM",
  ];
  const lower = text.toLowerCase();
  return catalog.filter((term) => lower.includes(term.toLowerCase()));
}

function stripDiacritics(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function normalizeHostPathUrl(
  hostname: string,
  parts: string[],
  allowedHosts: string[],
  isValidPath: (parts: string[]) => boolean,
  search = "",
) {
  if (!allowedHosts.includes(hostname)) return null;
  if (!isValidPath(parts)) return null;
  return `https://${hostname}/${parts.join("/")}${search}`.replace(/\/$/u, "");
}

function cleanedSearch(parsed: URL) {
  const ignoredPrefixes = ["utm_", "trk", "fbclid", "gclid", "igshid", "mibextid", "ref"];
  const params = [...parsed.searchParams.entries()].filter(
    ([key]) => !ignoredPrefixes.some((prefix) => key.toLowerCase().startsWith(prefix)),
  );
  if (!params.length) return "";
  const normalized = new URLSearchParams(params);
  return `?${normalized.toString()}`;
}

function normalizedPath(parsed: URL) {
  try {
    return parsed.pathname
      .split("/")
      .filter(Boolean)
      .map((part) => decodeURIComponent(part).trim().toLowerCase())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function isGithubProfilePath(parts: string[]) {
  const reserved = new Set(["features", "topics", "collections", "marketplace", "pricing", "login", "signup", "orgs", "organizations"]);
  return parts.length === 1 && !reserved.has(parts[0]);
}

function isSingleSegmentPath(parts: string[]) {
  return parts.length === 1;
}

function isStackOverflowUserPath(parts: string[]) {
  return parts[0] === "users" && parts.length >= 2;
}

function titleVariants(title: string) {
  const cleanedTitle = cleanPhrase(title);
  const match = TITLE_EQUIVALENTS.find(([pattern]) => pattern.test(cleanedTitle));
  return unique([cleanedTitle, ...(match?.[1] ?? [])]).slice(0, 5);
}

function splitRequirements(value: string) {
  return unique(
    plainText(value)
      .split(/\n|[•●▪]/u)
      .map((line) => line.replace(/^[-–—*\d.)\s]+/u, "").trim())
      .filter((line) => line.length >= 3),
  );
}

function cleanPhrase(value: string) {
  return plainText(value).replace(/\s+/gu, " ").trim();
}

function plainText(value: string) {
  return value
    .replace(/<[^>]*>/gu, " ")
    .replace(/&nbsp;|&#160;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&quot;|&#34;/giu, '"')
    .replace(/&#39;|&apos;/giu, "'")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">");
}

function quote(value: string) {
  return `"${value.replace(/["\\]/gu, " ").replace(/\s+/gu, " ").trim()}"`;
}

function orClause(values: string[]) {
  return `(${values.map(quote).join(" OR ")})`;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}
