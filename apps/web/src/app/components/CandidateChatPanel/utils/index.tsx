import { MessagesSquare } from "lucide-react";
import type { Candidate, CandidateMessageChannel } from "@/app/data";
import { CHANNELS, WIDGET_CHANNEL_KEY } from "../constants";

export function getLastMessage(candidate: Candidate) {
  return candidate.messages[candidate.messages.length - 1];
}

export function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function labelForChannel(channel: CandidateMessageChannel) {
  return CHANNELS.find((item) => item.value === channel)?.label ?? "Hệ thống";
}

export function iconForChannel(channel: CandidateMessageChannel) {
  return CHANNELS.find((item) => item.value === channel)?.icon ?? <MessagesSquare size={12} />;
}

export function formatCandidateName(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toLocaleUpperCase("vi-VN") + part.slice(1))
    .join(" ");
}

export function readStorage(key: string) {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) ?? "";
}

export function writeStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
}

export function readStoredChannel(): CandidateMessageChannel {
  const stored = readStorage(WIDGET_CHANNEL_KEY);
  return CHANNELS.some((item) => item.value === stored) ? stored as CandidateMessageChannel : "system";
}

