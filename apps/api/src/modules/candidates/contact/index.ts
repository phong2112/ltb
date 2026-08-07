import { Prisma } from "@prisma/client";

/** Lowercase + trim an email for duplicate lookups. */
export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

/**
 * Normalize a phone number to bare digits, converting a leading Vietnam country
 * code (84) into the local 0-prefixed form so duplicates collapse.
 */
export function normalizePhone(value?: string) {
  const digits = value?.replace(/\D/g, "") ?? "";

  if (!digits) return undefined;
  if (digits.length === 11 && digits.startsWith("84")) {
    return `0${digits.slice(2)}`;
  }

  return digits;
}

/**
 * Normalize LinkedIn profile URLs so the same candidate is not duplicated by
 * protocol, www/mobile host, query params, or trailing slash differences.
 */
export function normalizeLinkedinUrl(value?: string) {
  const raw = value?.trim();
  if (!raw) return undefined;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return undefined;
  }

  const host = url.hostname.toLowerCase().replace(/^m\./, "www.");
  if (host !== "linkedin.com" && host !== "www.linkedin.com") {
    return undefined;
  }

  const path = url.pathname.replace(/\/+$/, "").toLowerCase();
  if (!/^\/(in|pub)\/[^/]+/.test(path)) {
    return undefined;
  }

  return `https://www.linkedin.com${path}`;
}

/**
 * Take per-contact transaction advisory locks so concurrent submissions for the
 * same email/phone/LinkedIn URL serialize and cannot create duplicate candidates.
 * Keys are sorted to avoid deadlocks when both email and phone are locked.
 */
export async function lockCandidateContacts(
  tx: Prisma.TransactionClient,
  normalizedEmail?: string,
  normalizedPhone?: string,
  normalizedLinkedinUrl?: string,
) {
  const lockKeys: string[] = [];

  if (normalizedEmail) {
    lockKeys.push(`candidate-email:${normalizedEmail}`);
  }

  if (normalizedPhone) {
    lockKeys.push(`candidate-phone:${normalizedPhone}`);
  }

  if (normalizedLinkedinUrl) {
    lockKeys.push(`candidate-linkedin:${normalizedLinkedinUrl}`);
  }

  for (const lockKey of lockKeys.sort()) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey})::bigint)`;
  }
}
