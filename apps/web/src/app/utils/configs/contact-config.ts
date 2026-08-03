export const contactConfig = {
  email: readContactEnv("VITE_CONTACT_EMAIL", "v.bichlt6@vinsmartfuture.tech"),
  messengerUrl: readContactEnv("VITE_CONTACT_MESSENGER_URL", "https://www.facebook.com/share/1D8gQE5Gha/?mibextid=wwXIfr"),
  linkedinUrl: readContactEnv("VITE_CONTACT_LINKEDIN_URL", "https://www.linkedin.com/in/luongbich0197/"),
  phoneDisplay: readContactEnv("VITE_CONTACT_PHONE_DISPLAY", "+84 70 4561321"),
  phoneHref: readContactEnv("VITE_CONTACT_PHONE_HREF", "tel:+84704561321"),
} as const;

type ContactEnvKey =
  | "VITE_CONTACT_EMAIL"
  | "VITE_CONTACT_MESSENGER_URL"
  | "VITE_CONTACT_LINKEDIN_URL"
  | "VITE_CONTACT_PHONE_DISPLAY"
  | "VITE_CONTACT_PHONE_HREF";

function readContactEnv(key: ContactEnvKey, fallback: string) {
  return import.meta.env[key]?.trim() || fallback;
}
