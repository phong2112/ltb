export function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export function withPdfPreviewOptions(url: string) {
  const [baseUrl, existingHash = ""] = url.split("#", 2);
  const params = new URLSearchParams(existingHash);
  params.set("pagemode", "none");
  params.set("navpanes", "0");
  params.set("view", "FitH");
  return `${baseUrl}#${params.toString()}`;
}

export function formatFileType(mimeType: string) {
  if (!mimeType) return "—";
  return mimeType.split("/").pop()?.toUpperCase() ?? mimeType;
}

export function formatFileSize(sizeBytes: number) {
  if (!sizeBytes) return "—";
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

