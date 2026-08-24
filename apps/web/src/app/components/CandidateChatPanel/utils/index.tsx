import { MessagesSquare } from "lucide-react";
import type { Candidate, CandidateMessageChannel } from "@/app/data";
import { CHANNELS, WIDGET_CHANNEL_KEY } from "@/app/components/CandidateChatPanel/constants";

/** Returns the newest message because candidate messages are stored chronologically. */
export function getLastMessage(candidate: Candidate) {
  return candidate.messages[candidate.messages.length - 1];
}

/** Formats message timestamps for the compact Vietnamese chat panel UI. */
export function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/** Resolves a message channel to the label shown in the channel selector. */
export function labelForChannel(channel: CandidateMessageChannel) {
  return CHANNELS.find((item) => item.value === channel)?.label ?? "Hệ thống";
}

/** Resolves a message channel to its icon, falling back to a generic system icon. */
export function iconForChannel(channel: CandidateMessageChannel) {
  return CHANNELS.find((item) => item.value === channel)?.icon ?? <MessagesSquare size={12} />;
}

/** Normalizes pasted candidate names into title case for quick manual entry. */
export function formatCandidateName(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toLocaleUpperCase("vi-VN") + part.slice(1))
    .join(" ");
}

/** Reads localStorage safely because this panel can render before window exists. */
export function readStorage(key: string) {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) ?? "";
}

/** Writes localStorage safely because this panel can render before window exists. */
export function writeStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
}

/** Restores the last selected chat channel, ignoring stale values outside the current config. */
export function readStoredChannel(): CandidateMessageChannel {
  const stored = readStorage(WIDGET_CHANNEL_KEY);
  return CHANNELS.some((item) => item.value === stored) ? stored as CandidateMessageChannel : "system";
}
