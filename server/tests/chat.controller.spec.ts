import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameServer, GameServerSocket } from "../src/types.ts";
import { logSocketError } from "../src/controllers/socket.controller.ts";
import { socketJoin } from "../src/controllers/chat.controller.ts";
import { createChat } from "../src/services/chat.service.ts";
import { populateSafeUserInfo } from "../src/services/user.service.ts";
import { getUserByUsername } from "../src/services/auth.service.ts";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test";

const makeToken = (username: string) => jwt.sign({ username }, process.env.JWT_SECRET as string);

vi.mock(import("../src/controllers/socket.controller.ts"), () => {
  return { logSocketError: vi.fn() };
});

const MockGameServer = vi.fn(
  class {
    to = vi.fn(() => this);
    emit = vi.fn();
  },
);

const MockGameServerSocket = vi.fn(
  class {
    id = "mockGameServerSocket";
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
});

describe("socketJoin", () => {
  it("should check auth and reject invalid auth", async () => {
    const chat = await createChat(new Date());
    await socketJoin(mockSocket, mockServer)({ token: BAD_TOKEN, payload: chat.chatId });
    expect(logSocketError).toHaveBeenCalledExactlyOnceWith(mockSocket, expect.any(Error));
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
    expect(mockSocket.emit).toHaveBeenCalledWith("chatUserJoined", {
      chatId: chat.chatId,
      user,
    });
  });
});
