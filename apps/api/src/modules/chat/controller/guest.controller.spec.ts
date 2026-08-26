import { ForbiddenException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import type { ChatService } from "../service/index.service";
import { GUEST_CHAT_COOKIE_NAME, GuestChatController } from "./guest.controller";

describe("GuestChatController", () => {
  function setup() {
    const chatService = {
      createOrRotateSession: jest.fn().mockResolvedValue({
        sessionToken: "session-secret",
        recoveryToken: "recovery-secret",
        sessionMaxAgeSeconds: 604800,
      }),
      getGuestRealtimeIdentity: jest.fn().mockResolvedValue("device-1"),
      getGuestSnapshot: jest.fn().mockResolvedValue({
        conversation: null,
        messages: { items: [], nextCursor: null },
      }),
    };
    const config = {
      get: jest.fn((key: string) => {
        if (key === "WEB_ORIGIN") return "https://careers.example.com";
        if (key === "AUTH_COOKIE_SECURE") return "true";
        return undefined;
      }),
    };
    const realtimeTickets = { issue: jest.fn().mockReturnValue({ ticket: "ticket", expiresAt: "2026-08-26T12:00:00.000Z" }) };
    return {
      controller: new GuestChatController(
        chatService as unknown as ChatService,
        config as unknown as ConfigService,
        realtimeTickets as never,
      ),
      chatService,
      realtimeTickets,
    };
  }

  it("sets the primary token only in an HttpOnly cookie", async () => {
    const { controller } = setup();
    const cookie = jest.fn();
    const response = { cookie } as unknown as Response;
    const request = { headers: {} } as Request;

    await expect(controller.createSession(request, response)).resolves.toEqual({
      recoveryToken: "recovery-secret",
    });
    expect(cookie).toHaveBeenCalledWith(
      GUEST_CHAT_COOKIE_NAME,
      "session-secret",
      expect.objectContaining({ httpOnly: true, secure: true, sameSite: "none", path: "/" }),
    );
  });

  it("returns an explicit JSON wrapper when the guest has no conversation yet", async () => {
    const { controller, chatService } = setup();
    const request = {
      headers: { cookie: "guest_chat_session=session-secret" },
    } as Request;

    await expect(controller.getConversation(request)).resolves.toEqual({
      conversation: null,
      messages: { items: [], nextCursor: null },
    });
    expect(chatService.getGuestSnapshot).toHaveBeenCalledWith("session-secret");
  });

  it("issues a device-scoped realtime ticket with a tighter reconnect limit", async () => {
    const { controller, chatService, realtimeTickets } = setup();
    const request = { headers: { cookie: "guest_chat_session=session-secret" } } as Request;

    await expect(controller.createRealtimeTicket(request)).resolves.toEqual({
      ticket: "ticket",
      expiresAt: "2026-08-26T12:00:00.000Z",
    });
    expect(chatService.getGuestRealtimeIdentity).toHaveBeenCalledWith("session-secret");
    expect(realtimeTickets.issue).toHaveBeenCalledWith("GUEST", "device-1");
    expect(Reflect.getMetadata("THROTTLER:LIMITchat", GuestChatController.prototype.createRealtimeTicket)).toBe(10);
  });

  it("uses the isolated chat rate-limit bucket for message sends", () => {
    const handler = GuestChatController.prototype.sendMessage;

    expect(Reflect.getMetadata("THROTTLER:LIMITchat", handler)).toBe(60);
    expect(Reflect.getMetadata("THROTTLER:LIMITdefault", handler)).toBeUndefined();
  });

  it("allows four times the default chat rate for conversation snapshots", () => {
    const handler = GuestChatController.prototype.getConversation;

    expect(Reflect.getMetadata("THROTTLER:LIMITchat", handler)).toBe(1_200);
    expect(Reflect.getMetadata("THROTTLER:TTLchat", handler)).toBe(60_000);
    expect(Reflect.getMetadata("THROTTLER:LIMITdefault", handler)).toBeUndefined();
  });

  it("rejects a browser origin outside the configured allowlist before creating a session", async () => {
    const { controller, chatService } = setup();
    const request = { headers: { origin: "https://attacker.example" } } as Request;
    const response = { cookie: jest.fn() } as unknown as Response;

    await expect(controller.createSession(request, response)).rejects.toBeInstanceOf(ForbiddenException);
    expect(chatService.createOrRotateSession).not.toHaveBeenCalled();
  });
});
