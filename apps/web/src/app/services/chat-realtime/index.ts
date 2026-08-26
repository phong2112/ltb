import {
  CHAT_REALTIME_EVENTS,
  CHAT_REALTIME_PATH,
  type ChatConversationUpdatedEvent,
  type ChatMessageCreatedEvent,
  type ChatReadUpdatedEvent,
  type ChatRealtimeReadyEvent,
  type ChatRealtimeTicketResponse,
} from "@hr-copilot/shared";
import { io } from "socket.io-client";
import { API_BASE } from "@/app/apis/requests/client";

type ChatRealtimeCallbacks = {
  getTicket: () => Promise<ChatRealtimeTicketResponse>;
  onReady: (event: ChatRealtimeReadyEvent) => void;
  onMessage: (event: ChatMessageCreatedEvent) => void;
  onConversation: (event: ChatConversationUpdatedEvent) => void;
  onRead?: (event: ChatReadUpdatedEvent) => void;
  onConnectionChange?: (connected: boolean) => void;
};

export type ChatRealtimeConnection = {
  close: () => void;
};

export function connectChatRealtime(callbacks: ChatRealtimeCallbacks): ChatRealtimeConnection {
  const endpoint = resolveRealtimeEndpoint();
  const socket = io(endpoint.url, {
    path: endpoint.path,
    transports: ["websocket"],
    autoConnect: false,
    reconnection: false,
  });
  let closed = false;
  let connecting = false;
  let reconnectDelayMs = 1_000;
  let reconnectTimer: number | undefined;

  socket.on(CHAT_REALTIME_EVENTS.ready, callbacks.onReady);
  socket.on(CHAT_REALTIME_EVENTS.messageCreated, callbacks.onMessage);
  socket.on(CHAT_REALTIME_EVENTS.conversationUpdated, callbacks.onConversation);
  if (callbacks.onRead) socket.on(CHAT_REALTIME_EVENTS.readUpdated, callbacks.onRead);
  socket.on("connect", () => {
    reconnectDelayMs = 1_000;
    callbacks.onConnectionChange?.(true);
  });
  socket.on("disconnect", () => {
    callbacks.onConnectionChange?.(false);
    scheduleReconnect();
  });
  socket.on("connect_error", () => {
    callbacks.onConnectionChange?.(false);
    socket.disconnect();
    scheduleReconnect();
  });

  function scheduleReconnect() {
    if (closed || reconnectTimer !== undefined) return;
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = undefined;
      void connect();
    }, reconnectDelayMs);
    reconnectDelayMs = Math.min(reconnectDelayMs * 2, 30_000);
  }

  async function connect() {
    if (closed || connecting || socket.connected) return;
    connecting = true;
    try {
      const credentials = await callbacks.getTicket();
      if (closed) return;
      socket.auth = { ticket: credentials.ticket };
      socket.connect();
    } catch {
      scheduleReconnect();
    } finally {
      connecting = false;
    }
  }

  void connect();
  return {
    close() {
      closed = true;
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      socket.removeAllListeners();
      socket.disconnect();
    },
  };
}

function resolveRealtimeEndpoint() {
  const configured = (import.meta.env.VITE_REALTIME_URL as string | undefined)?.trim();
  if (configured) {
    return { url: configured.replace(/\/$/, ""), path: CHAT_REALTIME_PATH };
  }

  if (/^https?:\/\//i.test(API_BASE)) {
    const apiUrl = new URL(API_BASE);
    return {
      url: apiUrl.origin,
      path: `${apiUrl.pathname.replace(/\/$/, "")}${CHAT_REALTIME_PATH}`,
    };
  }

  return {
    url: window.location.origin,
    path: `${API_BASE}${CHAT_REALTIME_PATH}`.replace(/\/+/g, "/"),
  };
}
