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
 * Take per-contact transaction advisory locks so concurrent submissions for the
 * same email/phone serialize and cannot create duplicate candidates.
 * Keys are sorted to avoid deadlocks when both email and phone are locked.
 */
export async function lockCandidateContacts(
  tx: Prisma.TransactionClient,
  normalizedEmail?: string,
  normalizedPhone?: string,
) {
  const lockKeys: string[] = [];

  if (normalizedEmail) {
    lockKeys.push(`candidate-email:${normalizedEmail}`);
  }

  if (normalizedPhone) {
    lockKeys.push(`candidate-phone:${normalizedPhone}`);
  }

  for (const lockKey of lockKeys.sort()) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey})::bigint)`;
  }
}
