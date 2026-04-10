import { describe, expect, it } from "vitest";
import { createMessage } from "../../src/services/message.service.ts";
import {
  createChat,
  forceChatById,
  addMessageToChat,
  addMoveLogToChat,
  getMoveLog,
} from "../../src/services/chat.service.ts";
import { getUserByUsername } from "../../src/services/auth.service.ts";

describe("createMessage", () => {
  it("should create a message and return the populated MessageInfo", async () => {
    const record = await getUserByUsername("user1");
    const user = { userId: record!.userId, username: "user1" };
    const createdAt = new Date("2025-06-01T12:00:00Z");

    const result = await createMessage(user, "hello world", createdAt);

    expect(result.messageId).toEqual(expect.any(String));
    expect(result.text).toBe("hello world");
    expect(result.createdAt).toStrictEqual(createdAt);
    expect(result.createdBy.username).toBe("user1");
  });
});

describe("forceChatById", () => {
  it("should create a new chat when given a dm: id that does not exist yet", async () => {
    const record = await getUserByUsername("user1");
    const user = { userId: record!.userId, username: "user1" };

    const result = await forceChatById("dm:user1:user2", user);

    expect(result.chatId).toBe("dm:user1:user2");
    expect(result.messages).toStrictEqual([]);
    expect(result.moveLog).toStrictEqual([]);
  });
});

describe("addMessageToChat", () => {
  it("should add a message and return the updated ChatInfo", async () => {
    const record = await getUserByUsername("user1");
    const user = { userId: record!.userId, username: "user1" };
    const chat = await createChat(new Date());
    const msg = await createMessage(user, "test message", new Date());

    const result = await addMessageToChat(chat.chatId, user, msg.messageId);

    expect(result.chatId).toBe(chat.chatId);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].text).toBe("test message");
  });

  it("should throw if the chat does not exist", async () => {
    const record = await getUserByUsername("user1");
    const user = { userId: record!.userId, username: "user1" };

    await expect(addMessageToChat("invalid-id", user, "any-msg-id")).rejects.toThrow();
  });
});

describe("addMoveLogToChat", () => {
  it("should add a move log entry and return the payload", async () => {
    const record = await getUserByUsername("user1");
    const user = { userId: record!.userId, username: "user1" };
    const chat = await createChat(new Date());
    const createdAt = new Date("2025-06-01T15:00:00Z");

    const result = await addMoveLogToChat(chat.chatId, "Pawn e2-e4", user, createdAt);

    expect(result.chatId).toBe(chat.chatId);
    expect(result.moveDescription).toBe("Pawn e2-e4");
    expect(result.user.username).toBe("user1");
    expect(result.createdAt).toStrictEqual(createdAt);
  });

  it("should throw if the chat does not exist", async () => {
    const record = await getUserByUsername("user1");
    const user = { userId: record!.userId, username: "user1" };

    await expect(addMoveLogToChat("invalid-id", "Pawn e2-e4", user, new Date())).rejects.toThrow();
  });

  it("should populate moveLog entries when populateChatInfo runs after a move log is added", async () => {
    const record = await getUserByUsername("user1");
    const user = { userId: record!.userId, username: "user1" };
    const chat = await createChat(new Date());

    await addMoveLogToChat(chat.chatId, "Knight g1-f3", user, new Date());

    // forceChatById calls populateChatInfo which maps over the non-empty moveLog (line 21)
    const result = await forceChatById(chat.chatId, user);

    expect(result.moveLog).toHaveLength(1);
    expect(result.moveLog[0].moveDescription).toBe("Knight g1-f3");
    expect(result.moveLog[0].user.username).toBe("user1");
  });
});

describe("getMoveLog", () => {
  it("should return move log entries for a valid chat", async () => {
    const record = await getUserByUsername("user1");
    const user = { userId: record!.userId, username: "user1" };
    const chat = await createChat(new Date());

    await addMoveLogToChat(chat.chatId, "Bishop f1-c4", user, new Date());

    const result = await getMoveLog(chat.chatId);

    expect(result).toHaveLength(1);
    expect(result[0].moveDescription).toBe("Bishop f1-c4");
  });

  it("should return an empty array for an invalid chat id", async () => {
    const result = await getMoveLog("nonexistent-chat-id");

    expect(result).toStrictEqual([]);
  });
});
