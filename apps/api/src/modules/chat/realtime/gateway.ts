import { Logger } from "@nestjs/common";
import { CHAT_REALTIME_EVENTS, CHAT_REALTIME_PATH, type ChatRealtimeReadyEvent } from "@hr-copilot/shared";
import { OnGatewayConnection, OnGatewayInit, WebSocketGateway } from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { adminChatRoom, guestChatRoom } from "../constants";
import { ChatRealtimePublisher } from "./publisher.service";
import { ChatRealtimeTicketService } from "./ticket.service";

type ChatSocketData = {
  role: "GUEST" | "ADMIN";
  subject: string;
};

@WebSocketGateway({ path: CHAT_REALTIME_PATH, transports: ["websocket"] })
export class ChatRealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(ChatRealtimeGateway.name);

  constructor(
    private readonly tickets: ChatRealtimeTicketService,
    private readonly publisher: ChatRealtimePublisher,
  ) {}

  afterInit(server: Server) {
    this.publisher.bind(server);
    server.use((socket: Socket, next) => {
      const ticket = socket.handshake.auth?.ticket;
      if (typeof ticket !== "string") return next(new Error("unauthorized"));
      try {
        const claims = this.tickets.verify(ticket);
        socket.data = { role: claims.role, subject: claims.sub } satisfies ChatSocketData;
        next();
      } catch {
        next(new Error("unauthorized"));
      }
    });
  }

  async handleConnection(socket: Socket) {
    const data = socket.data as ChatSocketData;
    const room = data.role === "GUEST" ? guestChatRoom(data.subject) : adminChatRoom(data.subject);
    await socket.join(room);
    const ready: ChatRealtimeReadyEvent = { connectedAt: new Date().toISOString() };
    socket.emit(CHAT_REALTIME_EVENTS.ready, ready);
    this.logger.debug(`chat_socket_connected role=${data.role}`);
  }
}
