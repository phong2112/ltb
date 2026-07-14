import DOMPurify from "dompurify";

const RICH_TEXT_TAG_PATTERN = /<\/?(?:p|br|strong|em|u|s|h2|h3|ul|ol|li|a|blockquote)\b/i;

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "h2", "h3", "ul", "ol", "li", "a", "blockquote"],
  ALLOWED_ATTR: ["href", "rel"],
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function plainTextToHtml(value: string) {
  const blocks: string[] = [];
  let listItems: string[] = [];
  const formatInlineText = (text: string) => escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(`<ul>${listItems.join("")}</ul>`);
    listItems = [];
  };

  value.split(/\r?\n/).forEach(line => {
    if (line.startsWith("- ")) {
      listItems.push(`<li>${formatInlineText(line.slice(2))}</li>`);
      return;
    }

    flushList();
    blocks.push(`<p>${line ? formatInlineText(line) : "<br>"}</p>`);
  });
  flushList();
  return blocks.join("");
}

export function normalizeRichText(value: string) {
  const html = RICH_TEXT_TAG_PATTERN.test(value) ? value : plainTextToHtml(value);
  return DOMPurify.sanitize(html, SANITIZE_CONFIG);
}

export function sanitizeRichText(value: string) {
  return DOMPurify.sanitize(value, SANITIZE_CONFIG);
}

function richTextToPlainText(value: string) {
  if (!RICH_TEXT_TAG_PATTERN.test(value)) return value;

  const htmlWithSpacing = sanitizeRichText(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(?:p|h2|h3|li|blockquote)>/gi, " ");
  return new DOMParser().parseFromString(htmlWithSpacing, "text/html").body.textContent ?? "";
}

export function getMeaningfulRichTextLength(value: string) {
  return richTextToPlainText(value).trim().replace(/\s+/gu, " ").length;
}
