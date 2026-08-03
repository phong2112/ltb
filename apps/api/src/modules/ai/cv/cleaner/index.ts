import type { MatchCriterion } from "../../../../models/ai";

export type AiReadyCvText = {
  text: string;
  sourceCharacters: number;
  cleanedCharacters: number;
  redactionCount: number;
  truncated: boolean;
  strategy: "full_cleaned_text" | "criteria_curated_pack";
  selectedCharacters: number;
  omittedCharacters: number;
  sections: string[];
  criterionSnippetCount?: number;
};

const EMAIL_PATTERN = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/giu;
const PHONE_PATTERN = /(?:\+?\d[\d\s.\-()]{7,}\d)/gu;
const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s)"'<>]+/giu;
const SENSITIVE_LABEL_PATTERN =
  /^(?:address|địa chỉ|date of birth|dob|ngày sinh|gender|giới tính|marital status|tình trạng hôn nhân|nationality|quốc tịch)\s*[:：-]/iu;
const REDACTION_MARKER = "[THÔNG TIN CÁ NHÂN ĐÃ ẨN]";
const TRUNCATION_MARKER = "\n\n[... NỘI DUNG GIỮA CV ĐÃ ĐƯỢC RÚT GỌN ...]\n\n";
const MAX_SECTION_CHARACTERS = 12_000;
const MAX_CRITERION_SNIPPETS = 2;
const SNIPPET_CONTEXT_LINES = 2;
const MIN_KEYWORD_LENGTH = 2;

export function cleanExtractedCvText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\u00ad/g, "")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/gu, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/([^\W\d_])-\n(?=[^\W\d_])/gu, "$1")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, lines) => line || lines[index - 1])
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function prepareCvTextForAi(
  value: string,
  maxCharacters: number,
  sensitiveValues: Array<string | null | undefined> = [],
): AiReadyCvText {
  return prepareCvText(value, maxCharacters, sensitiveValues);
}

export function prepareCvMatchInputForAi(
  value: string,
  maxCharacters: number,
  criteria: MatchCriterion[],
  sensitiveValues: Array<string | null | undefined> = [],
): AiReadyCvText {
  return prepareCvText(value, maxCharacters, sensitiveValues, criteria);
}

function prepareCvText(
  value: string,
  maxCharacters: number,
  sensitiveValues: Array<string | null | undefined>,
  criteria: MatchCriterion[] = [],
): AiReadyCvText {
  const cleaned = removeNoisyLines(cleanExtractedCvText(value));
  let redactionCount = 0;

  const redact = (text: string, pattern: RegExp) => text.replace(pattern, () => {
    redactionCount += 1;
    return REDACTION_MARKER;
  });

  const redactedLines = cleaned.split("\n").map((line) => {
    if (SENSITIVE_LABEL_PATTERN.test(line)) {
      redactionCount += 1;
      return REDACTION_MARKER;
    }

    return redact(redactPhones(redact(line, EMAIL_PATTERN)), URL_PATTERN);
  });
  const redacted = sensitiveValues.reduce<string>((text, sensitiveValue) => {
    if (!sensitiveValue) return text;
    const normalizedValue = cleanExtractedCvText(sensitiveValue);
    if (normalizedValue.length < 3) return text;
    const pattern = new RegExp(escapeRegExp(normalizedValue), "giu");
    return redact(text, pattern);
  }, collapseRepeatedLines(redactedLines).join("\n").trim());
  const matchingText = criteria.length > 0 ? removeRedactionMarkerLines(redacted) : redacted;
  const curated = criteria.length > 0
    ? buildCriteriaCuratedPack(matchingText, criteria, maxCharacters)
    : {
        text: truncateKeepingBeginningAndEnd(redacted, maxCharacters),
        strategy: "full_cleaned_text" as const,
        sections: detectSectionNames(redacted),
        criterionSnippetCount: undefined,
      };

  return {
    text: curated.text,
    sourceCharacters: value.length,
    cleanedCharacters: redacted.length,
    redactionCount,
    truncated: curated.text.length < redacted.length,
    strategy: curated.strategy,
    selectedCharacters: curated.text.length,
    omittedCharacters: Math.max(0, redacted.length - curated.text.length),
    sections: curated.sections,
    ...(curated.criterionSnippetCount === undefined ? {} : { criterionSnippetCount: curated.criterionSnippetCount }),
  };

  function redactPhones(text: string) {
    return text.replace(PHONE_PATTERN, (match) => {
      const digitCount = match.replace(/\D/gu, "").length;
      if (digitCount < 9 || digitCount > 15) return match;
      redactionCount += 1;
      return REDACTION_MARKER;
    });
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export function calculateTextQuality(value: string) {
  if (!value.trim()) return 0;

  const characters = Array.from(value);
  const visible = characters.filter((character) => !/\s/u.test(character));
  if (visible.length === 0) return 0;

  const lettersAndNumbers = visible.filter((character) => /[\p{L}\p{N}]/u.test(character)).length;
  const replacementCharacters = visible.filter((character) => character === "\uFFFD").length;
  const controlCharacters = visible.filter((character) => /[\p{Cc}\p{Cf}]/u.test(character)).length;
  const readableRatio = lettersAndNumbers / visible.length;
  const suspiciousRatio = (replacementCharacters + controlCharacters) / visible.length;
  const tokens = value.toLocaleLowerCase("vi").match(/[\p{L}\p{N}][\p{L}\p{N}+#.-]*/gu) ?? [];
  const uniqueRatio = tokens.length === 0 ? 0 : new Set(tokens).size / tokens.length;

  const score = readableRatio * 75
    + Math.min(uniqueRatio, 0.6) / 0.6 * 25
    - Math.min(suspiciousRatio * 500, 50);

  return Math.max(0, Math.min(100, Math.round(score)));
}

function collapseRepeatedLines(lines: string[]) {
  const result: string[] = [];

  for (const line of lines) {
    const previous = result.at(-1);
    if (line && previous && normalizeComparableLine(line) === normalizeComparableLine(previous)) {
      continue;
    }
    result.push(line);
  }

  return result;
}

function normalizeComparableLine(value: string) {
  return value.toLocaleLowerCase("vi").replace(/\s+/g, " ").trim();
}

function removeNoisyLines(value: string) {
  const lines = value.split("\n");
  const comparableCounts = new Map<string, number>();
  for (const line of lines) {
    const comparable = normalizeComparableLine(line);
    if (comparable.length >= 3) comparableCounts.set(comparable, (comparableCounts.get(comparable) ?? 0) + 1);
  }

  return lines
    .filter((line) => {
      const normalized = normalizeComparableLine(line);
      if (!normalized) return true;
      if (/^page\s+\d+(?:\s+of\s+\d+)?$/iu.test(normalized)) return false;
      if (/^(?:trang\s+)?\d+\s*\/\s*\d+$/iu.test(normalized)) return false;
      if (isMostlySymbols(normalized)) return false;
      const repeatedCount = comparableCounts.get(normalized) ?? 0;
      return repeatedCount <= 3 || normalized.length > 80 || looksLikeImportantCvLine(normalized);
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function removeRedactionMarkerLines(value: string) {
  return value
    .split("\n")
    .filter((line) => !line.includes(REDACTION_MARKER))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildCriteriaCuratedPack(redacted: string, criteria: MatchCriterion[], maxCharacters: number) {
  const sections = splitCvSections(redacted);
  const sectionSummaries = buildPrioritySectionSummaries(sections);
  const snippetsByCriterion = buildCriterionSnippets(redacted, criteria, sections);
  const criterionSnippetCount = snippetsByCriterion.reduce((sum, item) => sum + item.snippets.length, 0);
  const body = [
    "CV_INPUT_DA_CHUAN_HOA",
    "Quy ước: dữ liệu dưới đây đã được clean OCR, giảm PII, bỏ dòng lặp/nhiễu và ưu tiên đoạn liên quan đến tiêu chí JD.",
    "",
    "[SECTION_QUAN_TRONG]",
    ...sectionSummaries,
    "",
    "[BANG_CHUNG_THEO_TIEU_CHI]",
    ...snippetsByCriterion.flatMap((item) => [
      `- ${item.criterion.id}: ${item.criterion.text}`,
      ...(item.snippets.length
        ? item.snippets.map((snippet, index) => `  Evidence candidate ${index + 1}: ${snippet}`)
        : ["  Evidence candidate: Không tìm thấy đoạn CV liên quan rõ ràng trong dữ liệu đã trích xuất."]),
    ]),
  ].join("\n").trim();

  return {
    text: truncateKeepingBeginningAndEnd(body, maxCharacters),
    strategy: "criteria_curated_pack" as const,
    sections: Array.from(new Set(sections.map((section) => section.kind))),
    criterionSnippetCount,
  };
}

type CvSection = {
  kind: string;
  heading: string;
  lines: string[];
};

function splitCvSections(value: string): CvSection[] {
  const sections: CvSection[] = [{ kind: "profile", heading: "Profile", lines: [] }];

  for (const line of value.split("\n")) {
    const headingKind = classifyCvHeading(line);
    if (headingKind) {
      sections.push({ kind: headingKind, heading: line.replace(/:$/, "").trim(), lines: [] });
      continue;
    }
    sections.at(-1)?.lines.push(line);
  }

  return sections
    .map((section) => ({ ...section, lines: trimBlankEdges(section.lines) }))
    .filter((section) => section.lines.some((line) => line.trim()));
}

function buildPrioritySectionSummaries(sections: CvSection[]) {
  const result: string[] = [];
  const used = new Set<CvSection>();

  for (const kind of ["profile", "summary", "skills", "experience", "projects", "education", "certifications", "languages"]) {
    for (const section of sections.filter((item) => item.kind === kind)) {
      if (used.has(section)) continue;
      used.add(section);
      const content = section.lines.join("\n").slice(0, sectionLimit(kind)).trim();
      if (content) result.push(`[${section.heading || kind}]\n${content}`);
    }
  }

  if (result.length > 0) return result;
  return [sections.map((section) => section.lines.join("\n")).join("\n\n").slice(0, MAX_SECTION_CHARACTERS)];
}

function buildCriterionSnippets(redacted: string, criteria: MatchCriterion[], sections: CvSection[]) {
  const lines = redacted.split("\n");
  const chunks = buildSearchChunks(lines, sections);

  return criteria.map((criterion) => {
    const keywords = extractKeywords(criterion.text);
    const snippets = chunks
      .map((chunk) => ({ ...chunk, score: scoreChunk(chunk, keywords) }))
      .filter((chunk) => chunk.score > 0)
      .sort((left, right) => right.score - left.score || left.text.length - right.text.length)
      .map((chunk) => chunk.text)
      .filter(uniqueNormalized)
      .slice(0, MAX_CRITERION_SNIPPETS);

    return { criterion, snippets };
  });
}

function buildSearchChunks(lines: string[], sections: CvSection[]) {
  const sectionByLine = mapSectionKindsByLine(sections);

  return lines
    .map((line, index) => {
      if (!line.trim() || classifyCvHeading(line)) return undefined;
      const start = Math.max(0, index - SNIPPET_CONTEXT_LINES);
      const end = Math.min(lines.length, index + SNIPPET_CONTEXT_LINES + 1);
      const text = lines.slice(start, end).join(" ").replace(/\s+/g, " ").trim();
      if (text.length < 20) return undefined;
      return {
        text: text.slice(0, 700),
        kind: sectionByLine.get(index) ?? "other",
      };
    })
    .filter((chunk): chunk is { text: string; kind: string } => Boolean(chunk));
}

function mapSectionKindsByLine(sections: CvSection[]) {
  const result = new Map<number, string>();
  let index = 0;

  for (const section of sections) {
    index += 1;
    for (const line of section.lines) {
      result.set(index, section.kind);
      index += 1;
      if (line === "") index += 1;
    }
  }

  return result;
}

function scoreChunk(chunk: { text: string; kind: string }, keywords: string[]) {
  if (keywords.length === 0) return 0;
  const normalizedText = normalizeSearchText(chunk.text);
  let score = 0;

  for (const keyword of keywords) {
    if (normalizedText.includes(keyword)) score += keyword.length >= 5 ? 3 : 1;
  }

  if (score > 0 && ["skills", "experience", "projects", "certifications"].includes(chunk.kind)) score += 1;
  return score;
}

function extractKeywords(value: string) {
  const normalized = normalizeSearchText(value);
  const tokens = normalized.match(/[\p{L}\p{N}][\p{L}\p{N}+#.-]*/gu) ?? [];
  return Array.from(new Set(
    tokens
      .map((token) => token.trim())
      .filter((token) => token.length >= MIN_KEYWORD_LENGTH && !STOPWORDS.has(token)),
  ));
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("vi")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueNormalized(value: string, index: number, values: string[]) {
  const normalized = normalizeSearchText(value);
  return values.findIndex((item) => normalizeSearchText(item) === normalized) === index;
}

function detectSectionNames(value: string) {
  return Array.from(new Set(splitCvSections(value).map((section) => section.kind)));
}

function classifyCvHeading(line: string) {
  const normalized = line
    .replace(/:$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("vi");
  if (!normalized || normalized.length > 50 || normalized.split(/\s+/).length > 5) return undefined;

  return CV_SECTION_HEADINGS.get(normalized);
}

function sectionLimit(kind: string) {
  if (kind === "skills") return 5_000;
  if (kind === "experience" || kind === "projects") return 9_000;
  if (kind === "profile" || kind === "summary") return 3_500;
  return 2_500;
}

function trimBlankEdges(lines: string[]) {
  const copy = [...lines];
  while (copy[0]?.trim() === "") copy.shift();
  while (copy.at(-1)?.trim() === "") copy.pop();
  return copy;
}

function isMostlySymbols(value: string) {
  const visible = Array.from(value).filter((character) => !/\s/u.test(character));
  if (visible.length < 4) return false;
  const symbols = visible.filter((character) => !/[\p{L}\p{N}]/u.test(character)).length;
  return symbols / visible.length >= 0.75;
}

function looksLikeImportantCvLine(value: string) {
  return /(react|node|java|python|typescript|javascript|aws|docker|kubernetes|sql|ielts|toeic|degree|engineer|developer|manager|kinh nghiệm|dự án|chứng chỉ|học vấn)/iu.test(value);
}

function truncateKeepingBeginningAndEnd(value: string, maxCharacters: number) {
  if (value.length <= maxCharacters) return value;
  if (maxCharacters <= TRUNCATION_MARKER.length) return value.slice(0, maxCharacters);

  const available = maxCharacters - TRUNCATION_MARKER.length;
  const beginningLength = Math.round(available * 0.7);
  const endLength = available - beginningLength;
  return `${value.slice(0, beginningLength).trimEnd()}${TRUNCATION_MARKER}${value.slice(-endLength).trimStart()}`;
}

const CV_SECTION_HEADINGS = new Map<string, string>([
  ["career objective", "summary"],
  ["objective", "summary"],
  ["professional summary", "summary"],
  ["profile", "summary"],
  ["summary", "summary"],
  ["tóm tắt", "summary"],
  ["mục tiêu nghề nghiệp", "summary"],
  ["giới thiệu", "summary"],
  ["technical skills", "skills"],
  ["skills", "skills"],
  ["key skills", "skills"],
  ["kỹ năng", "skills"],
  ["kỹ năng chuyên môn", "skills"],
  ["competencies", "skills"],
  ["work experience", "experience"],
  ["professional experience", "experience"],
  ["experience", "experience"],
  ["employment history", "experience"],
  ["kinh nghiệm", "experience"],
  ["kinh nghiệm làm việc", "experience"],
  ["projects", "projects"],
  ["project experience", "projects"],
  ["dự án", "projects"],
  ["dự án tiêu biểu", "projects"],
  ["education", "education"],
  ["academic background", "education"],
  ["học vấn", "education"],
  ["trình độ học vấn", "education"],
  ["certifications", "certifications"],
  ["certificates", "certifications"],
  ["chứng chỉ", "certifications"],
  ["awards", "certifications"],
  ["languages", "languages"],
  ["language", "languages"],
  ["ngoại ngữ", "languages"],
]);

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "bat",
  "biết",
  "bắt",
  "buộc",
  "buoc",
  "cac",
  "cau",
  "cho",
  "co",
  "có",
  "các",
  "của",
  "cho",
  "cua",
  "da",
  "đã",
  "được",
  "duoc",
  "experience",
  "for",
  "have",
  "in",
  "is",
  "it",
  "kinh",
  "là",
  "làm",
  "la",
  "lam",
  "minimum",
  "must",
  "nam",
  "năm",
  "nghiem",
  "of",
  "or",
  "required",
  "the",
  "thành",
  "thạo",
  "thiểu",
  "thanh",
  "thao",
  "thieu",
  "to",
  "toi",
  "tối",
  "ung",
  "và",
  "va",
  "vien",
  "voi",
  "với",
  "yeu",
  "yêu",
  "ứng",
  "viên",
]);
