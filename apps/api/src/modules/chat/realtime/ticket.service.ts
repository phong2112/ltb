import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ChatRealtimeRole, ChatRealtimeTicketResponse } from "@hr-copilot/shared";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const TICKET_AUDIENCE = "chat-realtime";
const DEFAULT_TTL_SECONDS = 60;

type ChatRealtimeTicketClaims = {
  aud: typeof TICKET_AUDIENCE;
  sub: string;
  role: ChatRealtimeRole;
  exp: number;
  jti: string;
};

@Injectable()
export class ChatRealtimeTicketService {
  constructor(private readonly config: ConfigService) {}

  issue(role: ChatRealtimeRole, subject: string): ChatRealtimeTicketResponse {
    const ttlSeconds = this.config.get<number>("CHAT_REALTIME_TICKET_TTL_SECONDS") ?? DEFAULT_TTL_SECONDS;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const claims: ChatRealtimeTicketClaims = {
      aud: TICKET_AUDIENCE,
      sub: subject,
      role,
      exp: Math.floor(expiresAt.getTime() / 1000),
      jti: randomUUID(),
    };
    const encodedClaims = Buffer.from(JSON.stringify(claims)).toString("base64url");
    return {
      ticket: `${encodedClaims}.${this.sign(encodedClaims)}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  verify(ticket: string): ChatRealtimeTicketClaims {
    const [encodedClaims, providedSignature, extra] = ticket.split(".");
    if (!encodedClaims || !providedSignature || extra) throw this.invalidTicket();

    const expectedSignature = this.sign(encodedClaims);
    const expected = Buffer.from(expectedSignature);
    const provided = Buffer.from(providedSignature);
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) throw this.invalidTicket();

    try {
      const claims = JSON.parse(Buffer.from(encodedClaims, "base64url").toString("utf8")) as unknown;
      if (!isValidClaims(claims) || claims.exp <= Math.floor(Date.now() / 1000)) throw this.invalidTicket();
      return claims;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw this.invalidTicket();
    }
  }

  private sign(value: string) {
    return createHmac("sha256", this.config.getOrThrow<string>("CHAT_REALTIME_TICKET_SECRET"))
      .update(value)
      .digest("base64url");
  }

  private invalidTicket() {
    return new UnauthorizedException("Realtime ticket không hợp lệ hoặc đã hết hạn.");
  }
}

function isValidClaims(value: unknown): value is ChatRealtimeTicketClaims {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const claims = value as Record<string, unknown>;
  return claims.aud === TICKET_AUDIENCE
    && (claims.role === "GUEST" || claims.role === "ADMIN")
    && typeof claims.sub === "string"
    && claims.sub.length > 0
    && typeof claims.exp === "number"
    && Number.isInteger(claims.exp)
    && typeof claims.jti === "string";
}
