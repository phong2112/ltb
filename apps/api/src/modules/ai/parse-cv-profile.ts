import { normalizePhone } from "../candidates/candidate-contact.util";

export type RegexCvProfile = {
  email?: string;
  phone?: string;
  normalizedPhone?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
};

const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
// Vietnamese/international phone: optional +, groups of digits separated by space/dot/dash, 8-15 digits total.
const PHONE_PATTERN = /(?:\+?\d[\d\s.\-()]{7,}\d)/g;
const LINKEDIN_PATTERN = /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/[^\s)"'<>]+/i;
const URL_PATTERN = /https?:\/\/[^\s)"'<>]+/gi;

/**
 * Deterministic first pass over extracted CV text. Pulls the fields that regex
 * handles reliably (email, phone, LinkedIn, portfolio URL); name/skills are left
 * to the AI step or manual TA correction.
 */
export function parseCvProfileFromText(text: string): RegexCvProfile {
  const profile: RegexCvProfile = {};

  const email = text.match(EMAIL_PATTERN)?.[0];
  if (email) profile.email = email.toLowerCase();

  profile.phone = extractPhone(text);
  if (profile.phone) {
    profile.normalizedPhone = normalizePhone(profile.phone);
  }

  const linkedin = text.match(LINKEDIN_PATTERN)?.[0];
  if (linkedin) profile.linkedinUrl = stripTrailingPunctuation(linkedin);

  const portfolio = extractPortfolio(text, profile.linkedinUrl);
  if (portfolio) profile.portfolioUrl = portfolio;

  return profile;
}

function extractPhone(text: string): string | undefined {
  const candidates = text.match(PHONE_PATTERN) ?? [];

  for (const candidate of candidates) {
    const digits = candidate.replace(/\D/g, "");
    // Vietnamese mobile/landline numbers are 9-12 digits (incl. optional country code).
    if (digits.length >= 9 && digits.length <= 12) {
      return candidate.trim();
    }
  }

  return undefined;
}

function extractPortfolio(text: string, linkedinUrl?: string): string | undefined {
  const urls = text.match(URL_PATTERN) ?? [];

  for (const rawUrl of urls) {
    const url = stripTrailingPunctuation(rawUrl);
    if (/linkedin\.com/i.test(url)) continue;
    if (linkedinUrl && url === linkedinUrl) continue;
    return url;
  }

  return undefined;
}

function stripTrailingPunctuation(url: string): string {
  return url.replace(/[.,;:)"'<>]+$/u, "");
}
