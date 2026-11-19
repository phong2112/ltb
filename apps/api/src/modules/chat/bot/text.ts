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

export function truncateText(input: string, maxLength: number) {
  const trimmed = input.trim();
  return trimmed.length <= maxLength ? trimmed : `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
