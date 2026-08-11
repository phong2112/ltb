import { normalizePhone } from "../../candidates/contact";

export type RegexCvProfile = {
  fullName?: string;
  title?: string;
  email?: string;
  phone?: string;
  normalizedPhone?: string;
  skills?: string[];
  linkedinUrl?: string;
  portfolioUrl?: string;
};

const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
// Vietnamese/international phone: optional +, groups of digits separated by space/dot/dash, 8-15 digits total.
const PHONE_PATTERN = /(?:\+?\d[\d\s.\-()]{7,}\d)/g;
const LINKEDIN_DIRECT_PATTERN = /(?:https?:\/\/)?(?:www\.|m\.|[a-z]{2,3}\.)?linkedin\.com\/(?:in|pub)\/[a-z0-9][a-z0-9_]*(?:-[a-z0-9_]+)*(?:\/)?/i;
const LINKEDIN_LABEL_HANDLE_PATTERN = /\blinkedin\b\s*[:\-|]?\s*(?:\/?in\/)?([a-z0-9][a-z0-9_]*(?:-[a-z0-9_]+)+)\b/i;
const URL_PATTERN = /https?:\/\/[^\s)"'<>]+/gi;

/**
 * Deterministic first pass over extracted CV text. This keeps high-confidence
 * profile fields available even when AI enrichment is disabled or rate-limited.
 */
export function parseCvProfileFromText(text: string): RegexCvProfile {
  const profile: RegexCvProfile = {};

  profile.fullName = extractFullName(text);
  profile.title = extractTitle(text, profile.fullName);

  const email = text.match(EMAIL_PATTERN)?.[0];
  if (email) profile.email = email.toLowerCase();

  const phone = extractPhone(text);
  if (phone) {
    profile.phone = phone;
    profile.normalizedPhone = normalizePhone(phone);
  }

  const linkedin = extractLinkedinUrl(text);
  if (linkedin) profile.linkedinUrl = linkedin;

  const portfolio = extractPortfolio(text, profile.linkedinUrl);
  if (portfolio) profile.portfolioUrl = portfolio;

  const skills = extractSkills(text, profile.title);
  if (skills.length) profile.skills = skills;

  return profile;
}

function extractFullName(text: string): string | undefined {
  const lines = text
    .split(/\n+/)
    .map((line) => normalizeNameLine(line))
    .filter(Boolean)
    .slice(0, 30);

  for (const line of lines) {
    if (isLikelyNameLine(line)) return toTitleCaseName(line);
  }

  return undefined;
}

function extractTitle(text: string, fullName?: string): string | undefined {
  const lines = text
    .split(/\n+/)
    .map((line) => line.normalize("NFKC").replace(/\s+/gu, " ").trim())
    .filter(Boolean)
    .slice(0, 45);
  const nameIndex = fullName
    ? lines.findIndex((line) => normalizeNameForCompare(normalizeNameLine(line)) === normalizeNameForCompare(fullName))
    : -1;

  for (const line of lines.slice(0, 12)) {
    const titleFromNameLine = extractTitleFromNameLine(line, fullName);
    if (titleFromNameLine) return titleFromNameLine;
  }

  const preferredLines = nameIndex >= 0 ? lines.slice(nameIndex + 1, nameIndex + 6) : lines.slice(0, 12);
  for (const line of preferredLines) {
    for (const candidate of extractTitleCandidatesFromLine(line)) {
      if (isLikelyTitleLine(candidate, fullName)) return candidate;
    }
  }

  for (const line of lines.slice(0, 20)) {
    for (const candidate of extractTitleCandidatesFromLine(line)) {
      if (isLikelyTitleLine(candidate, fullName)) return candidate;
    }
  }

  const currentExperienceTitle = extractCurrentExperienceTitle(lines);
  if (currentExperienceTitle) return currentExperienceTitle;

  return undefined;
}

function extractTitleFromNameLine(line: string, fullName?: string) {
  if (!fullName || !line.includes("-")) return undefined;
  const [left, ...right] = line.split(/\s+[-–—]\s+/u);
  if (!right.length) return undefined;
  const normalizedLeft = normalizeNameLine(left);
  if (toTitleCaseName(normalizedLeft).toLocaleLowerCase("vi") !== fullName.toLocaleLowerCase("vi")) return undefined;
  const title = normalizeTitleLine(right.join(" - "));
  return isLikelyTitleLine(title) ? title : undefined;
}

function extractCurrentExperienceTitle(lines: string[]) {
  for (const line of lines.slice(0, 90)) {
    const match = line.match(/\(\s*([^)]{4,70})\s*\).*?\b(?:now|present|current|hiện tại|hien tai)\b/iu);
    if (!match?.[1]) continue;
    const title = normalizeTitleLine(match[1]);
    if (isLikelyTitleLine(title)) return title;
  }

  for (const line of lines.slice(0, 90)) {
    if (!/\b(?:now|present|current|hiện tại|hien tai)\b/iu.test(line)) continue;
    for (const candidate of extractTitleCandidatesFromLine(line)) {
      if (isLikelyTitleLine(candidate)) return candidate;
    }
  }

  return undefined;
}

function extractTitleCandidatesFromLine(line: string) {
  const normalized = normalizeTitleLine(line);
  const candidates = [normalized];

  candidates.push(normalizeTitleLine(normalized.replace(/^application\s+for\s*:\s*/iu, "")));
  candidates.push(normalizeTitleLine(normalized.replace(/^(?:current\s+)?(?:job\s+)?(?:title|position|role)\s*:\s*/iu, "")));

  const withoutDateRange = normalized
    .replace(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}\b.*$/iu, "")
    .replace(/\b\d{1,2}\/\d{4}\b.*$/u, "")
    .replace(/\b\d{4}\s*[-–—]\s*(?:now|present|current|\d{4})\b.*$/iu, "");
  candidates.push(normalizeTitleLine(withoutDateRange));

  const introTitle = normalized.match(/^(.{4,70}?\b(?:developer|engineer|designer|tester|analyst|manager|lead|specialist|architect|scrum master|agile coach))\s+(?:with|having|who|seeking|responsible)\b/iu)?.[1];
  if (introTitle) candidates.push(normalizeTitleLine(introTitle));

  return [...new Set(candidates.filter(Boolean))];
}

function normalizeTitleLine(line: string) {
  return line
    .replace(/^[\s|•*_.:;,-]+|[\s|•*_.:;,-]+$/gu, "")
    .replace(/\s*[-–—]\s*/gu, " - ")
    .replace(/\s*\|\s*/gu, " | ")
    .replace(/\s+/gu, " ")
    .trim();
}

function isLikelyTitleLine(line: string, fullName?: string) {
  if (line.length < 4 || line.length > 90) return false;
  if (/[0-9@:\\]/u.test(line)) return false;
  if (/^[([{]/u.test(line)) return false;
  if ((line.match(/,/gu)?.length ?? 0) >= 2) return false;
  if (line.split(/\s+/u).filter(Boolean).length > 8) return false;
  const normalized = line.toLocaleLowerCase("vi");
  if (fullName && normalized === fullName.toLocaleLowerCase("vi")) return false;
  if (TITLE_EXCLUDE_PATTERN.test(normalized)) return false;
  return TITLE_KEYWORD_PATTERN.test(normalized);
}

function extractSkills(text: string, title?: string) {
  const normalized = text.toLocaleLowerCase("en").normalize("NFKC");
  const focused = extractSkillFocusedText(text, title).toLocaleLowerCase("en").normalize("NFKC");
  const skills: string[] = [];

  for (const skill of SKILL_PATTERNS) {
    const searchText = skill.scope === "focused" ? focused : normalized;
    if (skill.pattern.test(searchText) && (!skill.requiresRoleContext || hasSkillRoleContext(normalized, title, skill.requiresRoleContext))) {
      skills.push(skill.label);
    }
    if (skills.length >= 30) break;
  }

  return [...new Set(skills)];
}

function extractSkillFocusedText(text: string, title?: string) {
  const lines = text
    .split(/\n+/)
    .map((line) => line.normalize("NFKC").replace(/\s+/gu, " ").trim())
    .filter(Boolean);
  const selected = new Set<string>();
  if (title) selected.add(title);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const normalized = line.toLocaleLowerCase("vi");
    if (SKILL_SECTION_HEADING_PATTERN.test(normalized)) {
      for (let offset = 0; offset <= 10; offset += 1) {
        const nearby = lines[index + offset];
        if (!nearby) break;
        if (offset > 0 && SECTION_BREAK_PATTERN.test(nearby.toLocaleLowerCase("vi"))) break;
        selected.add(nearby);
      }
    } else if (CERTIFICATION_LINE_PATTERN.test(normalized)) {
      selected.add(line);
    }
  }

  return Array.from(selected).join("\n");
}

function hasSkillRoleContext(text: string, title: string | undefined, context: RegExp) {
  return context.test(title?.toLocaleLowerCase("en") ?? "") || context.test(text);
}

function extractPhone(text: string): string | undefined {
  const candidates = text.match(PHONE_PATTERN) ?? [];

  for (const candidate of candidates) {
    const digits = candidate.replace(/\D/g, "");
    // Vietnamese mobile/landline numbers are 9-12 digits (incl. optional country code).
    if (digits.length >= 9 && digits.length <= 12) {
      return candidate.trim();
    }
  }

  return undefined;
}

function extractPortfolio(text: string, linkedinUrl?: string): string | undefined {
  const urls = text.match(URL_PATTERN) ?? [];

  for (const rawUrl of urls) {
    const url = stripTrailingPunctuation(rawUrl);
    if (/linkedin\.com/i.test(url)) continue;
    if (linkedinUrl && url === linkedinUrl) continue;
    return url;
  }

  return undefined;
}

function extractLinkedinUrl(text: string): string | undefined {
  const searchableText = normalizeLinkedinSearchText(text);
  const directUrl = searchableText.match(LINKEDIN_DIRECT_PATTERN)?.[0];
  if (directUrl) return normalizeLinkedinUrl(directUrl);

  const labeledHandle = searchableText.match(LINKEDIN_LABEL_HANDLE_PATTERN)?.[1];
  if (labeledHandle) return normalizeLinkedinUrl(`linkedin.com/in/${labeledHandle}`);

  return undefined;
}

function normalizeLinkedinSearchText(text: string) {
  return text
    .normalize("NFKC")
    .replace(/\blinked\s+in\b/giu, "linkedin")
    .replace(/https?\s*:\s*\/\s*\//giu, (match) => (match.toLocaleLowerCase("en").startsWith("https") ? "https://" : "http://"))
    .replace(/\b(www|m)\s*\.\s*/giu, (_, subdomain: string) => `${subdomain.toLocaleLowerCase("en")}.`)
    .replace(/linkedin\s*\.\s*com/giu, "linkedin.com")
    .replace(/\s*\/\s*/gu, "/")
    .replace(/-\s*\r?\n\s*/gu, "-")
    .replace(/\r?\n/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalizeLinkedinUrl(value: string): string | undefined {
  const compactUrl = stripTrailingPunctuation(value).replace(/\s+/gu, "");
  const urlWithProtocol = /^https?:\/\//iu.test(compactUrl) ? compactUrl : `https://${compactUrl}`;

  try {
    const parsedUrl = new URL(urlWithProtocol);
    const hostname = parsedUrl.hostname.toLocaleLowerCase("en").replace(/^(?:www|m)\./u, "");
    const [kind, rawSlug] = parsedUrl.pathname.split("/").filter(Boolean);
    const cleanSlug = rawSlug?.match(/^[a-z0-9][a-z0-9_-]*/iu)?.[0];

    if (hostname !== "linkedin.com") return undefined;
    if (!kind || !["in", "pub"].includes(kind.toLocaleLowerCase("en"))) return undefined;
    if (!cleanSlug) return undefined;

    return `https://www.linkedin.com/${kind.toLocaleLowerCase("en")}/${cleanSlug}`;
  } catch {
    return undefined;
  }
}

function stripTrailingPunctuation(url: string): string {
  return url.replace(/[.,;:)"'<>]+$/u, "");
}

function normalizeNameLine(line: string) {
  const normalized = line
    .normalize("NFKC")
    .replace(/\([^)]{1,30}\)/gu, " ")
    .replace(/^[\s|•*_.:;,-]+|[\s|•*_.:;,-]+$/gu, "")
    .replace(/\s+/gu, " ")
    .trim();

  const [beforeDash, ...afterDash] = normalized.split(/\s+[-–—]\s+/u);
  if (beforeDash && afterDash.length > 0 && NON_NAME_LINE_PATTERN.test(afterDash.join(" "))) {
    return beforeDash.trim();
  }

  return normalized;
}

function isLikelyNameLine(line: string) {
  if (line.length < 4 || line.length > 60) return false;
  if (/[0-9@:/\\]/u.test(line)) return false;
  if (/[()[\]{}]/u.test(line)) return false;
  if (!/^[\p{L}\s.'-]+$/u.test(line)) return false;

  const normalized = line.toLocaleLowerCase("vi");
  if (NON_NAME_LINE_PATTERN.test(normalized)) return false;

  const words = line.split(/\s+/u).filter(Boolean);
  if (words.length < 2 || words.length > 6) return false;
  if (words.some((word) => word.length === 1 && !/^[A-ZĐ]$/u.test(word))) return false;
  if (!isNameCased(line, words)) return false;

  return words.every((word) => /[\p{L}]/u.test(word));
}

function toTitleCaseName(line: string) {
  if (line === line.toLocaleUpperCase("vi")) {
    return line.toLocaleLowerCase("vi").replace(/(^|\s|-|')(\p{L})/gu, (_, prefix: string, letter: string) => (
      `${prefix}${letter.toLocaleUpperCase("vi")}`
    ));
  }

  return line;
}

function normalizeNameForCompare(line: string) {
  return toTitleCaseName(line)
    .replace(/\([^)]{1,30}\)/gu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleLowerCase("vi");
}

function isNameCased(line: string, words: string[]) {
  if (line === line.toLocaleUpperCase("vi")) return true;

  const nameCasedWords = words.filter((word) => {
    const firstLetter = word.match(/\p{L}/u)?.[0];
    return firstLetter ? firstLetter === firstLetter.toLocaleUpperCase("vi") : false;
  });

  return nameCasedWords.length === words.length;
}

const NON_NAME_LINE_PATTERN = /\b(?:curriculum|vitae|resume|cv|profile|summary|objective|experience|education|skills?|technical|project|portfolio|contact|email|phone|tel|address|linkedin|github|frontend|front-end|backend|back-end|fullstack|full-stack|developer|engineer|designer|tester|qa|quality|automation|ios|android|mobile|helpdesk|support|manager|specialist|analyst|intern|fresher|senior|junior|middle|mid-level|software|product|business|data|devops|thông tin|thong tin|liên hệ|lien he|công ty|cong ty|company|corporation|corp|jsc|llc|ltd|limited|co\.?|cp)\b/iu;
const TITLE_KEYWORD_PATTERN = /\b(?:frontend|front-end|backend|back-end|fullstack|full-stack|developer|engineer|designer|tester|qa|quality assurance|automation engineer|ios developer|android developer|mobile developer|helpdesk|support engineer|manager|lead|techlead|tech lead|specialist|analyst|intern|fresher|senior|junior|middle|mid-level|devops|architect|scrum master|agile coach|product designer|business analyst|data engineer|data analyst|data scientist)\b/iu;
const TITLE_EXCLUDE_PATTERN = /\b(?:email|phone|tel|address|linkedin|github|portfolio|profile|resume|cv|curriculum|vitae|summary|objective|experience|education|skills?|certifications?|languages?|professional summary|work experience|employment history|contact|company|corporation|corp|jsc|llc|ltd|limited|co\.?|công ty|cong ty|hanoi|ha noi|ho chi minh|danang|da nang|to me|great developer|just code|more than)\b/iu;
const SKILL_SECTION_HEADING_PATTERN = /\b(?:technical skills?|techinical stacks?|technical stacks?|key skills?|skills?|kỹ năng|ky nang|tools?|technologies|technology stack|tech stack|stacks?|programming languages?|frameworks?|platforms?|certifications?)\b/iu;
const SECTION_BREAK_PATTERN = /\b(?:experience|employment|work history|projects?|education|summary|objective|contact|reference|references)\b/iu;
const CERTIFICATION_LINE_PATTERN = /\b(?:certified|certification|certificate|istqb|aws certified|microsoft certified)\b/iu;
const QA_CONTEXT_PATTERN = /\b(?:qa engineer|qa lead|qa tester|test engineer|tester|quality assurance|quality control|software testing|test automation|manual testing|automation testing)\b/u;
const SKILL_PATTERNS: Array<{ label: string; pattern: RegExp; requiresRoleContext?: RegExp; scope?: "full" | "focused" }> = [
  { label: "QA", pattern: /\bqa\b|\bquality assurance\b/u, requiresRoleContext: QA_CONTEXT_PATTERN, scope: "focused" },
  { label: "QA Lead", pattern: /\bqa lead\b|\btest lead\b|\bquality lead\b/u, requiresRoleContext: QA_CONTEXT_PATTERN, scope: "focused" },
  { label: "Manual Testing", pattern: /\bmanual testing\b/u },
  { label: "Automation Testing", pattern: /\bautomation testing\b|\btest automation\b/u },
  { label: "Functional Testing", pattern: /\bfunctional testing\b/u },
  { label: "Regression Testing", pattern: /\bregression testing\b/u },
  { label: "Performance Testing", pattern: /\bperformance testing\b|\bload testing\b|\bstress testing\b/u },
  { label: "Security Testing", pattern: /\bsecurity testing\b|\bpenetration testing\b|\bpentest\b/u },
  { label: "API Testing", pattern: /\bapi testing\b|\bpostman\b|\bswagger\b/u },
  { label: "Mobile Testing", pattern: /\bmobile testing\b/u },
  { label: "AI Testing", pattern: /\bai testing\b|\bllm testing\b|\bmodel behavior\b|\bprediction flows\b/u },
  { label: "LLM", pattern: /\bllm\b|\blarge language model/u },
  { label: "Chatbot Testing", pattern: /\bchatbot\b/u },
  { label: "Test Management", pattern: /\btest manager\b|\btest management\b|\btest planning\b|\btest strategy\b/u },
  { label: "ISTQB", pattern: /\bistqb\b/u },
  { label: "Agile", pattern: /\bagile\b|\bscrum\b|\bkanban\b/u },
  { label: "Project Management", pattern: /\bproject management\b/u },
  { label: "React Native", pattern: /\breact native\b/u, scope: "focused" },
  { label: "React", pattern: /\breact(?:\.js|js)?\b/u, scope: "focused" },
  { label: "Angular", pattern: /\bangular(?:js)?\b/u, scope: "focused" },
  { label: "Vue.js", pattern: /\bvue(?:\.js|js)?\b/u, scope: "focused" },
  { label: "Next.js", pattern: /\bnext(?:\.js|js)?\b/u, scope: "focused" },
  { label: "TypeScript", pattern: /\btypescript\b|\bts\b/u, scope: "focused" },
  { label: "JavaScript", pattern: /\bjavascript\b|\bjs\b/u, scope: "focused" },
  { label: "Node.js", pattern: /\bnode(?:\.js|js)?\b/u, scope: "focused" },
  { label: "Express.js", pattern: /\bexpress(?:\.js|js)?\b/u, scope: "focused" },
  { label: "Python", pattern: /\bpython\b/u, scope: "focused" },
  { label: "Java", pattern: /\bjava\b/u, scope: "focused" },
  { label: "Spring Boot", pattern: /\bspring boot\b/u, scope: "focused" },
  { label: "Spring", pattern: /\bspring(?: framework| data| security)?\b/u, scope: "focused" },
  { label: "Go", pattern: /\bgolang\b|\bgo\b/u, scope: "focused" },
  { label: "C#", pattern: /(?:^|[^a-z0-9])c#(?:$|[^a-z0-9])/u, scope: "focused" },
  { label: "Kotlin", pattern: /\bkotlin\b/u, scope: "focused" },
  { label: "Swift", pattern: /\bswift\b/u, scope: "focused" },
  { label: "iOS", pattern: /\bios\b|\biphone\b|\bipad\b/u, scope: "focused" },
  { label: "Android", pattern: /\bandroid\b/u, scope: "focused" },
  { label: "SQL", pattern: /\bsql\b|\bpostgresql\b|\bmysql\b|\bsql server\b/u, scope: "focused" },
  { label: "PostgreSQL", pattern: /\bpostgres(?:ql)?\b/u, scope: "focused" },
  { label: "MySQL", pattern: /\bmysql\b/u, scope: "focused" },
  { label: "Oracle", pattern: /\boracle\b/u, scope: "focused" },
  { label: "MongoDB", pattern: /\bmongodb\b|\bno ?sql\b/u, scope: "focused" },
  { label: "Redis", pattern: /\bredis\b/u, scope: "focused" },
  { label: "Kafka", pattern: /\bkafka\b/u, scope: "focused" },
  { label: "RabbitMQ", pattern: /\brabbitmq\b/u, scope: "focused" },
  { label: "Docker", pattern: /\bdocker\b/u, scope: "focused" },
  { label: "Kubernetes", pattern: /\bkubernetes\b|\bk8s\b/u, scope: "focused" },
  { label: "AWS", pattern: /\baws\b|\bamazon web services\b/u, scope: "focused" },
  { label: "Azure", pattern: /\bazure\b/u, scope: "focused" },
  { label: "Salesforce", pattern: /\bsalesforce\b/u, scope: "focused" },
  { label: "Apex", pattern: /\bapex\b/u, scope: "focused" },
  { label: "LWC", pattern: /\blwc\b|\blightning web components\b/u, scope: "focused" },
  { label: "Selenium", pattern: /\bselenium\b/u, scope: "focused" },
  { label: "JUnit", pattern: /\bjunit\b/u, scope: "focused" },
  { label: "Jest", pattern: /\bjest\b/u, scope: "focused" },
  { label: "Playwright", pattern: /\bplaywright\b/u, scope: "focused" },
  { label: "Cypress", pattern: /\bcypress\b/u, scope: "focused" },
  { label: "CI/CD", pattern: /\bci\/cd\b|\bcicd\b/u, scope: "focused" },
];
