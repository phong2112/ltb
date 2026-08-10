/** Adds the current page as a return target while preserving existing query params. */
export function appendReturnTo(path: string, returnTo: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}from=${encodeURIComponent(returnTo)}`;
}

/** Allows redirects only back into the admin area to avoid open-redirect URLs. */
export function safeAdminReturnTo(value: string | null, fallback: string) {
  if (!value || value.includes("\\") || value.startsWith("//")) return fallback;
  return value === "/admin" || value.startsWith("/admin/") ? value : fallback;
}
