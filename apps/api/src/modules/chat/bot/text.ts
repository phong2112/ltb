export function normalizeForMatching(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9+#\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const HANDOFF_PHRASES = [
  "gap hr",
  "gap ta",
  "gap nguoi",
  "nguoi that",
  "gap chi bich",
  "gap bich",
  "noi chuyen voi hr",
  "noi chuyen voi ta",
  "noi chuyen voi chi bich",
  "noi chuyen voi nguoi",
  "chat voi hr",
  "chat voi ta",
  "chat voi nguoi",
  "chat voi chi bich",
  "lien he hr",
  "lien he truc tiep",
  "nhan vien tu van",
  "tu van vien",
  "talk to a human",
  "talk to human",
  "talk to hr",
  "speak to hr",
  "real person",
  "human agent",
];

export function isHandoffRequest(message: string) {
  const padded = ` ${normalizeForMatching(message)} `;
  return HANDOFF_PHRASES.some(phrase => padded.includes(` ${phrase} `));
}

export type SmallTalk = "greeting" | "thanks" | "goodbye";

const SMALL_TALK_PHRASES: Record<SmallTalk, string[]> = {
  greeting: ["xin chao", "chao", "hello", "hi", "alo", "hey"],
  thanks: ["cam on", "thanks", "thank you", "tks", "thank"],
  goodbye: ["tam biet", "bye", "goodbye", "hen gap lai"],
};

/** Recognizes short social messages so the offline responder does not hand them to TA. */
export function detectSmallTalk(message: string): SmallTalk | null {
  const padded = ` ${normalizeForMatching(message)} `;
  for (const [kind, phrases] of Object.entries(SMALL_TALK_PHRASES) as [SmallTalk, string[]][]) {
    if (phrases.some(phrase => padded.includes(` ${phrase} `))) return kind;
  }
  return null;
}

export function truncateText(input: string, maxLength: number) {
  const trimmed = input.trim();
  return trimmed.length <= maxLength ? trimmed : `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
