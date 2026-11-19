import type { ChatBotKnowledge } from "./context";
import { normalizeForMatching } from "./text";

/** A suggested question sent as-is (or typed exactly) maps straight to its knowledge entry. */
export function findFaqByQuestion(question: string, knowledge: ChatBotKnowledge[]) {
  const key = normalizeForMatching(question);
  if (!key) return null;
  return knowledge.find(entry => normalizeForMatching(entry.title) === key) ?? null;
}

/** Approved answers are sent verbatim so FAQ replies are never shortened, reworded, or embellished. */
export function composeFaqAnswer(entries: ChatBotKnowledge[]) {
  return entries.map(entry => entry.content.trim()).join("\n\n");
}

export function resolveFaqIds(ids: string[], knowledge: ChatBotKnowledge[]) {
  const byId = new Map(knowledge.map(entry => [entry.id, entry]));
  return [...new Set(ids)].map(id => byId.get(id)).filter((entry): entry is ChatBotKnowledge => entry !== undefined);
}
