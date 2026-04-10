import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameServer, GameServerSocket } from "../src/types.ts";
import { logSocketError } from "../src/controllers/socket.controller.ts";
import { socketJoin, socketLeave, socketSendMessage } from "../src/controllers/chat.controller.ts";
import { createChat } from "../src/services/chat.service.ts";
import { populateSafeUserInfo } from "../src/services/user.service.ts";
import { getUserByUsername } from "../src/services/auth.service.ts";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test";

const makeToken = (username: string) => jwt.sign({ username }, process.env.JWT_SECRET as string);

vi.mock(import("../src/controllers/socket.controller.ts"), () => ({
  logSocketError: vi.fn(),
}));

const MockGameServer = vi.fn(
  class {
    to = vi.fn(() => this);
    emit = vi.fn();
  },
);

const MockGameServerSocket = vi.fn(
  class {
    id = "mockGameServerSocket";
    rooms = new Set<string>();
    join = vi.fn();
    leave = vi.fn();
    emit = vi.fn();
    to = vi.fn(() => this);
  },
);

const mockServer = new MockGameServer() as unknown as GameServer;
const mockSocket = new MockGameServerSocket() as unknown as GameServerSocket;

const TOKEN1 = makeToken("user1");
const BAD_TOKEN = "invalidtoken";

afterEach(() => {
  vi.resetAllMocks();
  (mockSocket as unknown as { rooms: Set<string> }).rooms = new Set();
});

describe("socketJoin", () => {
  it("should check auth and reject invalid auth", async () => {
    const chat = await createChat(new Date());
    await socketJoin(mockSocket, mockServer)({ token: BAD_TOKEN, payload: chat.chatId });
    expect(logSocketError).toHaveBeenCalledExactlyOnceWith(mockSocket, expect.any(Error));
  });

  it("should reject when token is not a string", async () => {
    const chat = await createChat(new Date());
    await socketJoin(mockSocket, mockServer)({ token: 12345, payload: chat.chatId });
    expect(logSocketError).toHaveBeenCalledOnce();
  });

  it("should reject when user is not found in db", async () => {
    const chat = await createChat(new Date());
    const ghostToken = makeToken("ghost_user_xyz");
    await socketJoin(mockSocket, mockServer)({ token: ghostToken, payload: chat.chatId });
    expect(logSocketError).toHaveBeenCalledOnce();
  });

  it("should reject an invalid chat id", async () => {
    await socketJoin(mockSocket, mockServer)({ token: TOKEN1, payload: "hi" });
    expect(logSocketError).toHaveBeenCalledExactlyOnceWith(
      mockSocket,
      new Error("user user1 accessed invalid chat id"),
    );
  });

  it("should proceed without errors, add the user to the room connection, and send chatJoined and chatUserJoined messages", async () => {
    const chat = await createChat(new Date());
    const record = await getUserByUsername("user1");
    const user = await populateSafeUserInfo(record!.userId);
    await socketJoin(mockSocket, mockServer)({ token: TOKEN1, payload: chat.chatId });
    expect(logSocketError).not.toHaveBeenCalled();
    expect(mockSocket.join).toHaveBeenCalledExactlyOnceWith(chat.chatId);
    expect(mockSocket.emit).toHaveBeenCalledWith("chatJoined", chat);
    expect(mockSocket.to).toHaveBeenCalledExactlyOnceWith(chat.chatId);
    expect(mockSocket.emit).toHaveBeenCalledWith("chatUserJoined", { chatId: chat.chatId, user });
  });
});

describe("socketLeave", () => {
  it("rejects invalid token", async () => {
    const chat = await createChat(new Date());
    await socketLeave(mockSocket, mockServer)({ token: BAD_TOKEN, payload: chat.chatId });
    expect(logSocketError).toHaveBeenCalledOnce();
  });

  it("rejects when user is not found in db", async () => {
    const chat = await createChat(new Date());
    const ghostToken = makeToken("ghost_user_xyz");
    await socketLeave(mockSocket, mockServer)({ token: ghostToken, payload: chat.chatId });
    expect(logSocketError).toHaveBeenCalledOnce();
  });

  it("rejects leaving a chat the socket isn't in", async () => {
    const chat = await createChat(new Date());
    await socketLeave(mockSocket, mockServer)({ token: TOKEN1, payload: chat.chatId });
    expect(logSocketError).toHaveBeenCalledOnce();
  });

  it("leaves successfully when socket is in the room", async () => {
    const chat = await createChat(new Date());
    (mockSocket as unknown as { rooms: Set<string> }).rooms.add(chat.chatId);
    await socketLeave(mockSocket, mockServer)({ token: TOKEN1, payload: chat.chatId });
    expect(logSocketError).not.toHaveBeenCalled();
    expect(mockSocket.leave).toHaveBeenCalledWith(chat.chatId);
    expect(mockSocket.to).toHaveBeenCalledWith(chat.chatId);
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "chatUserLeft",
      expect.objectContaining({
        chatId: chat.chatId,
      }),
    );
  });
});

describe("socketSendMessage", () => {
  it("rejects invalid token", async () => {
    const chat = await createChat(new Date());
    await socketSendMessage(
      mockSocket,
      mockServer,
    )({
      token: BAD_TOKEN,
      payload: { chatId: chat.chatId, text: "hello" },
    });
    expect(logSocketError).toHaveBeenCalledOnce();
  });

  it("rejects when user is not found in db", async () => {
    const chat = await createChat(new Date());
    const ghostToken = makeToken("ghost_user_xyz");
    await socketSendMessage(
      mockSocket,
      mockServer,
    )({
      token: ghostToken,
      payload: { chatId: chat.chatId, text: "hello" },
    });
    expect(logSocketError).toHaveBeenCalledOnce();
  });

  it("rejects invalid payload shape", async () => {
    await socketSendMessage(
      mockSocket,
      mockServer,
    )({
      token: TOKEN1,
      payload: "not-valid",
    });
    expect(logSocketError).toHaveBeenCalledOnce();
  });

  it("sends a message successfully", async () => {
    const chat = await createChat(new Date());
    await socketSendMessage(
      mockSocket,
      mockServer,
    )({
      token: TOKEN1,
      payload: { chatId: chat.chatId, text: "hello world" },
    });
    expect(logSocketError).not.toHaveBeenCalled();
    expect(mockServer.to).toHaveBeenCalledWith(chat.chatId);
    expect(mockServer.emit).toHaveBeenCalledWith(
      "chatNewMessage",
      expect.objectContaining({
        chatId: chat.chatId,
      }),
    );
  });
});
