export function appendReturnTo(path: string, returnTo: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}from=${encodeURIComponent(returnTo)}`;
}

export function safeAdminReturnTo(value: string | null, fallback: string) {
  if (!value || value.includes("\\") || value.startsWith("//")) return fallback;
  return value === "/admin" || value.startsWith("/admin/") ? value : fallback;
}
