import { CHAT_REALTIME_EVENTS } from "@hr-copilot/shared";
import { ChatRealtimeGateway } from "./gateway";

describe("ChatRealtimeGateway", () => {
  it("authenticates the handshake and joins only the identity room", async () => {
    let middleware: ((socket: Record<string, unknown>, next: (error?: Error) => void) => void) | undefined;
    const server = { use: jest.fn((handler) => { middleware = handler; }) };
    const tickets = { verify: jest.fn().mockReturnValue({ role: "GUEST", sub: "device-1" }) };
    const publisher = { bind: jest.fn() };
    const gateway = new ChatRealtimeGateway(tickets as never, publisher as never);
    gateway.afterInit(server as never);
    const socket = {
      handshake: { auth: { ticket: "signed-ticket" } },
      data: {},
      join: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
    };
    const next = jest.fn();

    middleware?.(socket, next);
    await gateway.handleConnection(socket as never);

    expect(next).toHaveBeenCalledWith();
    expect(socket.join).toHaveBeenCalledWith("guest:device-1");
    expect(socket.emit).toHaveBeenCalledWith(CHAT_REALTIME_EVENTS.ready, expect.any(Object));
  });

  it("rejects an invalid ticket before a room can be joined", () => {
    let middleware: ((socket: Record<string, unknown>, next: (error?: Error) => void) => void) | undefined;
    const server = { use: jest.fn((handler) => { middleware = handler; }) };
    const tickets = { verify: jest.fn(() => { throw new Error("invalid"); }) };
    const gateway = new ChatRealtimeGateway(tickets as never, { bind: jest.fn() } as never);
    gateway.afterInit(server as never);
    const next = jest.fn();

    middleware?.({ handshake: { auth: { ticket: "invalid" } }, data: {} }, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
