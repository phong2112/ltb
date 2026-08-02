export const contactConfig = {
  email: readContactEnv("VITE_CONTACT_EMAIL"),
  messengerUrl: readContactEnv("VITE_CONTACT_MESSENGER_URL"),
  linkedinUrl: readContactEnv("VITE_CONTACT_LINKEDIN_URL"),
  phoneDisplay: readContactEnv("VITE_CONTACT_PHONE_DISPLAY"),
  phoneHref: readContactEnv("VITE_CONTACT_PHONE_HREF"),
} as const;

type ContactEnvKey =
  | "VITE_CONTACT_EMAIL"
  | "VITE_CONTACT_MESSENGER_URL"
  | "VITE_CONTACT_LINKEDIN_URL"
  | "VITE_CONTACT_PHONE_DISPLAY"
  | "VITE_CONTACT_PHONE_HREF";

function readContactEnv(key: ContactEnvKey) {
  return import.meta.env[key]?.trim() ?? "";
}
