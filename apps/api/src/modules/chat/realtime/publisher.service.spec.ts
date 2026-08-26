import { CHAT_REALTIME_EVENTS } from "@hr-copilot/shared";
import { ChatSenderType } from "@prisma/client";
import { ChatRealtimePublisher } from "./publisher.service";

describe("ChatRealtimePublisher", () => {
  it("broadcasts a serialized message only to its guest and admin rooms", () => {
    const emit = jest.fn();
    const includeAdminRoom = jest.fn().mockReturnValue({ emit });
    const server = { to: jest.fn().mockReturnValue({ to: includeAdminRoom }) };
    const publisher = new ChatRealtimePublisher();
    publisher.bind(server as never);
    const createdAt = new Date("2026-08-26T12:00:00.000Z");

    publisher.messageCreated("device-1", {
      id: "message-1",
      conversationId: "conversation-1",
      senderType: ChatSenderType.GUEST,
      senderUserId: null,
      content: "Xin chào",
      clientMessageId: "client-1",
      readAt: null,
      createdAt,
    });

    expect(server.to).toHaveBeenCalledWith("guest:device-1");
    expect(includeAdminRoom).toHaveBeenCalledWith("admin:hr-admin");
    expect(emit).toHaveBeenCalledWith(CHAT_REALTIME_EVENTS.messageCreated, expect.objectContaining({
      eventId: "message-1",
      message: expect.objectContaining({ createdAt: createdAt.toISOString() }),
    }));
  });
});
