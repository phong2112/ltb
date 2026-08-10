const TENANT_PATH_PREFIX = "/t";

/** Resolves the active tenant from the URL path, subdomain, or configured fallback. */
export function currentTenantSlug() {
  if (typeof window === "undefined") return defaultTenantSlug();
  return tenantSlugFromPath(window.location.pathname) ?? tenantSlugFromHost(window.location.hostname) ?? defaultTenantSlug();
}

/** Prefixes internal routes with the active tenant slug when the current URL is tenant-scoped. */
export function tenantPath(path: string, currentPath = typeof window === "undefined" ? "" : window.location.pathname) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const slug = tenantSlugFromPath(currentPath);
  return slug ? `${TENANT_PATH_PREFIX}/${encodeURIComponent(slug)}${normalizedPath}` : normalizedPath;
}

/** Checks whether a pathname uses the /t/:slug tenant route convention. */
export function isTenantPath(pathname: string) {
  return Boolean(tenantSlugFromPath(pathname));
}

/** Removes the tenant prefix so shared route matching can work on canonical paths. */
export function stripTenantPath(pathname: string) {
  const slug = tenantSlugFromPath(pathname);
  if (!slug) return pathname;

  const prefix = `${TENANT_PATH_PREFIX}/${slug}`;
  const stripped = pathname.slice(prefix.length);
  return stripped || "/";
}

/** Reads and normalizes the tenant slug from /t/:slug paths. */
function tenantSlugFromPath(pathname: string) {
  const [, prefix, slug] = pathname.split("/");
  if (prefix !== "t" || !slug) return undefined;
  return decodeURIComponent(slug).trim().toLowerCase() || undefined;
}

/** Maps tenant subdomains to slugs while ignoring reserved app hostnames. */
function tenantSlugFromHost(hostname: string) {
  const rootDomain = (import.meta.env.VITE_PUBLIC_ROOT_DOMAIN as string | undefined)?.trim().toLowerCase();
  if (!rootDomain || !hostname.endsWith(`.${rootDomain}`)) return undefined;

  const subdomain = hostname.slice(0, -rootDomain.length - 1).split(".")[0];
  if (!subdomain || ["www", "app", "admin"].includes(subdomain)) return undefined;
  return subdomain;
}

/** Keeps single-tenant local/dev builds usable when no tenant is present in the URL. */
function defaultTenantSlug() {
  return ((import.meta.env.VITE_DEFAULT_TENANT_SLUG as string | undefined) || "ltb").trim().toLowerCase();
}
