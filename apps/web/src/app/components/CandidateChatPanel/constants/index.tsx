import { Mail, Linkedin, MessageCircle, MessagesSquare, Smartphone } from "lucide-react";
import type { ChannelOption } from "../types";

export const CHANNELS: ChannelOption[] = [
  { value: "system", label: "Hệ thống", status: "Nội bộ", icon: <MessagesSquare size={14} /> },
  { value: "messenger", label: "Messenger", status: "Chờ API", icon: <MessageCircle size={14} /> },
  { value: "zalo", label: "Zalo", status: "Chờ API", icon: <Smartphone size={14} /> },
  { value: "email", label: "Email", status: "Có thể nối SMTP/API", icon: <Mail size={14} /> },
  { value: "linkedin", label: "LinkedIn", status: "Ghi nhận thủ công", icon: <Linkedin size={14} /> },
];

export const WIDGET_ACTIVE_CANDIDATE_KEY = "hr-copilot-chat-widget-active-candidate";
export const WIDGET_SEARCH_KEY = "hr-copilot-chat-widget-search";
export const WIDGET_CHANNEL_KEY = "hr-copilot-chat-widget-channel";
export const WIDGET_DRAFT_KEY = "hr-copilot-chat-widget-draft";
export const CANDIDATE_BATCH_SIZE = 20;

