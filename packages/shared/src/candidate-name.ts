/**
 * Returns true when the stored candidate name is a placeholder, raw filename, or upload artifact
 * that should be replaced by the AI-extracted name from the CV text.
 *
 * Conditions that trigger replacement:
 * - Empty or whitespace-only string
 * - Vietnamese pending-status placeholder ("ứng viên đang xử lý")
 * - Name ends with a file extension (.pdf, .doc, .docx, .rtf, .txt)
 * - Long digit run combined with separator characters (typical inbound upload patterns)
 * - Name prefixed with "inbound" followed by digits
 * - Name contains an underscore (raw filename convention)
 * - Name exactly matches the CV filename without its extension
 */
export function shouldPreferExtractedName(currentName: string, originalName?: string | null): boolean {
  const trimmed = currentName.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  if (lower === "ứng viên đang xử lý") return true;
  if (/\.(pdf|docx?|rtf|txt)$/i.test(trimmed)) return true;
  if (/\d{6,}/.test(trimmed) && /[-_]/.test(trimmed)) return true;
  if (/(^|[-_])inbound\d/i.test(trimmed)) return true;
  if (trimmed.includes("_")) return true;
  const fileBaseName = originalName ? originalName.replace(/\.[^.]+$/, "").trim().toLowerCase() : "";
  return !!fileBaseName && lower === fileBaseName;
}
