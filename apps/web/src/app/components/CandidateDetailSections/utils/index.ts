/** Builds compact avatar initials from the last one or two words in a candidate name. */
export function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

/** Adds PDF viewer hash options so embedded CV previews open without navigation panes. */
export function withPdfPreviewOptions(url: string) {
  const [baseUrl, existingHash = ""] = url.split("#", 2);
  const params = new URLSearchParams(existingHash);
  params.set("pagemode", "none");
  params.set("navpanes", "0");
  params.set("view", "FitH");
  return `${baseUrl}#${params.toString()}`;
}

/** Converts a MIME type into a short user-facing file type label. */
export function formatFileType(mimeType: string) {
  if (!mimeType) return "—";
  return mimeType.split("/").pop()?.toUpperCase() ?? mimeType;
}

/** Formats stored file byte sizes for candidate detail metadata. */
export function formatFileSize(sizeBytes: number) {
  if (!sizeBytes) return "—";
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
