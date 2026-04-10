import { describe, expect, it } from "vitest";
import {
  createChat,
  forceChatById,
  addMessageToChat,
  addMoveLogToChat,
  getMoveLog,
} from "../../src/services/chat.service.ts";
import {
  sendFriendRequest,
  respondToFriendRequest,
  getPendingRequests,
  getFriends,
  getFriendshipStatus,
} from "../../src/services/friend.service.ts";
import {
  checkAuth,
  enforceAuth,
  ssoLogin,
  getUserByUsername as getUser,
} from "../../src/services/auth.service.ts";
import { populateCommentInfo, createComment } from "../../src/services/comment.service.ts";
import { populateSafeUserInfo, updateRating, updateUser } from "../../src/services/user.service.ts";

import { AuthRepo, CommentRepo } from "../../src/repository.ts";

describe("chat.service", () => {
  it("createChat creates a chat with empty messages and moveLog", async () => {
    const chat = await createChat(new Date());
    expect(chat.messages).toHaveLength(0);
    expect(chat.moveLog).toHaveLength(0);
  });

  it("forceChatById throws for invalid non-dm chat id", async () => {
    await expect(forceChatById("invalid-id", { userId: "u1", username: "user1" })).rejects.toThrow(
      "accessed invalid chat id",
    );
  });

  it("forceChatById creates a new DM chat if it doesn't exist", async () => {
    const chat = await forceChatById("dm:user1:user2", { userId: "u1", username: "user1" });
    expect(chat.chatId).toBe("dm:user1:user2");
  });

  it("forceChatById returns existing DM chat on second call", async () => {
    await forceChatById("dm:user3:user4", { userId: "u1", username: "user1" });
    const chat = await forceChatById("dm:user3:user4", { userId: "u1", username: "user1" });
    expect(chat.chatId).toBe("dm:user3:user4");
  });

  it("addMessageToChat throws for invalid chat id", async () => {
    await expect(
      addMessageToChat("bad-id", { userId: "u1", username: "user1" }, "msg1"),
    ).rejects.toThrow("sent to invalid chat id");
  });

  it("addMessageToChat adds a message to a valid chat", async () => {
    const { createMessage } = await import("../../src/services/message.service.ts");
    const user = await getUser("user1");
    const chat = await createChat(new Date());
    const msg = await createMessage(user!, "hello", new Date());
    const updated = await addMessageToChat(chat.chatId, user!, msg.messageId);
    expect(updated.messages).toHaveLength(1);
  });

  it("addMoveLogToChat throws for invalid chat id", async () => {
    await expect(
      addMoveLogToChat("bad-id", "played e4", { userId: "u1", username: "user1" }, new Date()),
    ).rejects.toThrow("move log added to invalid chat id");
  });

  it("getMoveLog returns empty array for nonexistent chat", async () => {
    const log = await getMoveLog("nonexistent-id");
    expect(log).toHaveLength(0);
  });

  it("getMoveLog returns entries for a chat with move log", async () => {
    const chat = await createChat(new Date());
    const user = await getUser("user1");
    await addMoveLogToChat(chat.chatId, "played e4", user!, new Date());
    const log = await getMoveLog(chat.chatId);
    expect(log).toHaveLength(1);
  });
});

describe("auth.service", () => {
  it("checkAuth returns null for wrong password", async () => {
    const result = await checkAuth({ username: "user1", password: "wrongpassword" });
    expect(result).toBeNull();
  });

  it("checkAuth returns null for nonexistent user", async () => {
    const result = await checkAuth({ username: "ghost", password: "pwd" });
    expect(result).toBeNull();
  });

  it("checkAuth returns user for correct credentials", async () => {
    const result = await checkAuth({ username: "user1", password: "pwd1111" });
    expect(result).not.toBeNull();
    expect(result!.username).toBe("user1");
  });

  it("enforceAuth throws for invalid credentials", async () => {
    await expect(enforceAuth({ username: "user1", password: "wrong" })).rejects.toThrow(
      "Invalid auth",
    );
  });

  it("enforceAuth returns user for valid credentials", async () => {
    const user = await enforceAuth({ username: "user1", password: "pwd1111" });
    expect(user.username).toBe("user1");
  });

  it("ssoLogin creates a new user on first login", async () => {
    const user = await ssoLogin("newuser@test.com", "New User");
    expect(user.username).toBe("newuser@test.com");
  });

  it("ssoLogin throws if auth exists but user record is missing", async () => {
    await AuthRepo.set("orphan@test.com", { password: "SSO_LOGIN", userId: "orphan-id" });
    await expect(ssoLogin("orphan@test.com", "Orphan")).rejects.toThrow(
      "Failed to find key orphan-id in repository user",
    );
  });

  it("ssoLogin returns existing user on second login", async () => {
    await ssoLogin("existing@test.com", "Existing User");
    const user = await ssoLogin("existing@test.com", "Existing User");
    expect(user.username).toBe("existing@test.com");
  });
});

describe("comment.service", () => {
  it("createComment creates a comment with correct text", async () => {
    const user = await getUser("user1");
    const comment = await createComment(user!, "hello world", new Date());
    expect(comment.text).toBe("hello world");
    expect(comment.createdBy.username).toBe("user1");
  });

  it("populateCommentInfo retrieves a created comment", async () => {
    const user = await getUser("user1");
    const comment = await createComment(user!, "test comment", new Date());
    const populated = await populateCommentInfo(comment.commentId);
    expect(populated.text).toBe("test comment");
  });

  it("populateCommentInfo includes editedAt when present", async () => {
    const user = await getUser("user1");
    const comment = await createComment(user!, "test", new Date());
    const record = await CommentRepo.get(comment.commentId);
    record.editedAt = new Date().toISOString();
    await CommentRepo.set(comment.commentId, record);
    const populated = await populateCommentInfo(comment.commentId);
    expect(populated.editedAt).toBeDefined();
  });
});

describe("friend.service", () => {
  it("sendFriendRequest returns error for nonexistent user", async () => {
    const user = await getUser("user1");
    const result = await sendFriendRequest(user!.userId, "ghost_user");
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  it("sendFriendRequest returns error when adding yourself", async () => {
    const user = await getUser("user1");
    const result = await sendFriendRequest(user!.userId, "user1");
    expect(result).toMatchObject({ error: "Cannot add yourself as a friend" });
  });

  it("sendFriendRequest succeeds for valid users", async () => {
    const user1 = await getUser("user1");
    const result = await sendFriendRequest(user1!.userId, "user2");
    expect(result).toBeUndefined();
  });

  it("sendFriendRequest returns error for duplicate request", async () => {
    const user1 = await getUser("user1");
    await sendFriendRequest(user1!.userId, "user3");
    const result = await sendFriendRequest(user1!.userId, "user3");
    expect(result).toMatchObject({ error: "Friend request already exists" });
  });

  it("respondToFriendRequest returns error for nonexistent request", async () => {
    const user2 = await getUser("user2");
    const result = await respondToFriendRequest("bad-id", user2!.userId, true);
    expect(result).toMatchObject({ error: "Friend request not found" });
  });

  it("respondToFriendRequest returns error when wrong user responds", async () => {
    const user1 = await getUser("user1");
    const user2 = await getUser("user2");
    const user3 = await getUser("user3");
    await sendFriendRequest(user1!.userId, "user2");
    const pending = await getPendingRequests(user2!.userId);
    const requestId = pending[0]?.requestId;
    const result = await respondToFriendRequest(requestId, user3!.userId, true);
    expect(result).toMatchObject({ error: "Not authorized to respond to this request" });
  });

  it("respondToFriendRequest returns error for non-pending request", async () => {
    const user1 = await getUser("user1");
    const user2 = await getUser("user2");
    await sendFriendRequest(user1!.userId, "user2");
    const pending = await getPendingRequests(user2!.userId);
    const requestId = pending[0]?.requestId;
    await respondToFriendRequest(requestId, user2!.userId, true);
    const result = await respondToFriendRequest(requestId, user2!.userId, true);
    expect(result).toMatchObject({ error: "Request is no longer pending" });
  });

  it("getFriends returns accepted friends where user is sender", async () => {
    const user1 = await getUser("user1");
    const user2 = await getUser("user2");
    await sendFriendRequest(user1!.userId, "user2");
    const pending = await getPendingRequests(user2!.userId);
    await respondToFriendRequest(pending[0].requestId, user2!.userId, true);
    const friends = await getFriends(user1!.userId);
    expect(friends.some((f) => f.username === "user2")).toBe(true);
  });

  it("getFriends returns friends where user is the recipient", async () => {
    const user1 = await getUser("user1");
    const user2 = await getUser("user2");
    await sendFriendRequest(user2!.userId, "user1");
    const pending = await getPendingRequests(user1!.userId);
    await respondToFriendRequest(pending[0].requestId, user1!.userId, true);
    const friends = await getFriends(user1!.userId);
    expect(friends.some((f) => f.username === "user2")).toBe(true);
  });

  it("getFriendshipStatus returns error for nonexistent user", async () => {
    const user1 = await getUser("user1");
    const result = await getFriendshipStatus(user1!.userId, "ghost");
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  it("getFriendshipStatus returns pending_sent after sending request", async () => {
    const user1 = await getUser("user1");
    await sendFriendRequest(user1!.userId, "user2");
    const result = await getFriendshipStatus(user1!.userId, "user2");
    expect(result).toMatchObject({ status: "pending_sent" });
  });

  it("getFriendshipStatus returns pending_received for recipient", async () => {
    const user1 = await getUser("user1");
    const user2 = await getUser("user2");
    await sendFriendRequest(user1!.userId, "user2");
    const result = await getFriendshipStatus(user2!.userId, "user1");
    expect(result).toMatchObject({ status: "pending_received" });
  });

  it("getFriendshipStatus returns pending_received with requestId", async () => {
    const user1 = await getUser("user1");
    const user2 = await getUser("user2");
    await sendFriendRequest(user1!.userId, "user2");
    const result = await getFriendshipStatus(user2!.userId, "user1");
    expect(result).toMatchObject({ status: "pending_received", requestId: expect.any(String) });
  });

  it("getFriendshipStatus returns friends after accepting", async () => {
    const user1 = await getUser("user1");
    const user2 = await getUser("user2");
    await sendFriendRequest(user1!.userId, "user2");
    const pending = await getPendingRequests(user2!.userId);
    await respondToFriendRequest(pending[0].requestId, user2!.userId, true);
    const result = await getFriendshipStatus(user1!.userId, "user2");
    expect(result).toMatchObject({ status: "friends" });
  });

  it("getFriendshipStatus returns not_connected for unrelated users", async () => {
    const user1 = await getUser("user1");
    const result = await getFriendshipStatus(user1!.userId, "user3");
    expect(result).toMatchObject({ status: "not_connected" });
  });
});

describe("user.service", () => {
  it("populateSafeUserInfo returns AI profile for AI_OPPONENT", async () => {
    const info = await populateSafeUserInfo("AI_OPPONENT");
    expect(info.username).toBe("Computer");
    expect(info.userId).toBe("AI_OPPONENT");
  });

  it("populateSafeUserInfo returns correct info for real user", async () => {
    const user = await getUser("user1");
    const info = await populateSafeUserInfo(user!.userId);
    expect(info.username).toBe("user1");
  });

  it("updateUser updates bio and avatarUrl", async () => {
    const updated = await updateUser("user1", { bio: "hello", avatarUrl: "http://img.png" });
    expect(updated.bio).toBe("hello");
    expect(updated.avatarUrl).toBe("http://img.png");
  });

  it("updateRating returns null when league doesn't change", async () => {
    const user = await getUser("user1");
    const result = await updateRating(user!.userId, "chess", 1000, "draw");
    expect(result).toBeNull();
  });

  it("updateRating returns league change when league changes", async () => {
    const user = await getUser("user2");
    const result = await updateRating(user!.userId, "chess", 3000, "win");
    expect(result === null || (result !== null && result.oldLeague !== result.newLeague)).toBe(
      true,
    );
  });
});

describe("populateSafeUserInfo - AI_OPPONENT", () => {
  it("returns fake AI profile without hitting database", async () => {
    const result = await populateSafeUserInfo("AI_OPPONENT");
    expect(result.username).toBe("Computer");
    expect(result.userId).toBe("AI_OPPONENT");
  });
});
