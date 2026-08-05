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

const TITLE_EQUIVALENTS: Array<[RegExp, string[]]> = [
  [/software engineer|software developer/iu, ["Software Engineer", "Software Developer"]],
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
