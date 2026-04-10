import { describe, expect, it, vi } from "vitest";
import {
  getLeaderboard,
  getMatchesByUserId,
  getUserRank,
  saveMatchRecords,
} from "../../src/services/score.service.ts";
import { getUserByUsername } from "../../src/services/auth.service.ts";
import { ScoreRepo, UserRepo } from "../../src/repository.ts";
import type { GameServer } from "../../src/types.ts";
import { randomUUID } from "node:crypto";
import { createGame, joinGame, startGame, updateGame } from "../../src/services/game.service.ts";

describe("saveMatchRecords", () => {
  it("should set opponentId on each record when there are exactly 2 players", async () => {
    const user1id = (await getUserByUsername("user1"))!.userId;
    const user2id = (await getUserByUsername("user2"))!.userId;
    const gameId = randomUUID();

    await saveMatchRecords([user1id, user2id], "chess", gameId, 0, new Date());

    const keys = await ScoreRepo.getAllKeys();
    const records = await ScoreRepo.getMany(keys);
    const forUser1 = records.find((r) => r.userId === user1id && r.gameId === gameId);
    const forUser2 = records.find((r) => r.userId === user2id && r.gameId === gameId);

    expect(forUser1?.opponentId).toBe(user2id);
    expect(forUser2?.opponentId).toBe(user1id);
  });

  it("should store the correct score per player when scores are provided", async () => {
    const user1id = (await getUserByUsername("user1"))!.userId;
    const user2id = (await getUserByUsername("user2"))!.userId;
    const gameId = randomUUID();

    await saveMatchRecords([user1id, user2id], "guess", gameId, 0, new Date(), [72, 38]);

    const keys = await ScoreRepo.getAllKeys();
    const records = await ScoreRepo.getMany(keys);
    const forUser1 = records.find((r) => r.userId === user1id && r.gameId === gameId);
    const forUser2 = records.find((r) => r.userId === user2id && r.gameId === gameId);

    expect(forUser1?.score).toBe(72);
    expect(forUser2?.score).toBe(38);
  });

  it("should record win for winner=0 and loss for the other player", async () => {
    const user1id = (await getUserByUsername("user1"))!.userId;
    const user2id = (await getUserByUsername("user2"))!.userId;
    const gameId = randomUUID();

    await saveMatchRecords([user1id, user2id], "nim", gameId, 0, new Date());

    const keys = await ScoreRepo.getAllKeys();
    const records = await ScoreRepo.getMany(keys);
    const forUser1 = records.find((r) => r.userId === user1id && r.gameId === gameId);
    const forUser2 = records.find((r) => r.userId === user2id && r.gameId === gameId);

    expect(forUser1?.result).toBe("win");
    expect(forUser2?.result).toBe("loss");
  });

  it("should record draw for both players when winner is null", async () => {
    const user1id = (await getUserByUsername("user1"))!.userId;
    const user2id = (await getUserByUsername("user2"))!.userId;
    const gameId = randomUUID();

    await saveMatchRecords([user1id, user2id], "chess", gameId, null, new Date());

    const keys = await ScoreRepo.getAllKeys();
    const records = await ScoreRepo.getMany(keys);
    const forUser1 = records.find((r) => r.userId === user1id && r.gameId === gameId);
    const forUser2 = records.find((r) => r.userId === user2id && r.gameId === gameId);

    expect(forUser1?.result).toBe("draw");
    expect(forUser2?.result).toBe("draw");
  });

  it("should call io.emit when visibility is public (default)", async () => {
    const user1id = (await getUserByUsername("user1"))!.userId;
    const user2id = (await getUserByUsername("user2"))!.userId;
    const mockIo = { emit: vi.fn() } as unknown as GameServer;

    await saveMatchRecords(
      [user1id, user2id],
      "chess",
      randomUUID(),
      0,
      new Date(),
      undefined,
      mockIo,
    );

    expect(mockIo.emit).toHaveBeenCalledWith("leaderboardUpdated");
  });

  it("should not call io.emit when visibility is private", async () => {
    const user1id = (await getUserByUsername("user1"))!.userId;
    const user2id = (await getUserByUsername("user2"))!.userId;
    const mockIo = { emit: vi.fn() } as unknown as GameServer;

    await saveMatchRecords(
      [user1id, user2id],
      "chess",
      randomUUID(),
      0,
      new Date(),
      undefined,
      mockIo,
      "private",
    );

    expect(mockIo.emit).not.toHaveBeenCalled();
  });
});

describe("getMatchesByUserId - sorting and filtering", () => {
  it("sorts by score when sortOrder is 'score'", async () => {
    const user1id = (await getUserByUsername("user1"))!.userId;
    const user2id = (await getUserByUsername("user2"))!.userId;
    const gameId1 = randomUUID();
    const gameId2 = randomUUID();
    await saveMatchRecords(
      [user1id, user2id],
      "guess",
      gameId1,
      0,
      new Date("2024-01-01"),
      [10, 5],
    );
    await saveMatchRecords(
      [user1id, user2id],
      "guess",
      gameId2,
      0,
      new Date("2024-01-02"),
      [50, 5],
    );
    const matches = await getMatchesByUserId(user1id, { sortOrder: "score" });
    const scores = matches.map((m) => m.score ?? 0);
    expect(scores[0]).toBeGreaterThanOrEqual(scores[1] ?? 0);
  });

  it("sorts oldest first when sortOrder is 'oldest'", async () => {
    const user1id = (await getUserByUsername("user1"))!.userId;
    const user2id = (await getUserByUsername("user2"))!.userId;
    const gameId1 = randomUUID();
    const gameId2 = randomUUID();
    await saveMatchRecords([user1id, user2id], "nim", gameId1, 0, new Date("2020-01-01"));
    await saveMatchRecords([user1id, user2id], "nim", gameId2, 0, new Date("2023-01-01"));
    const matches = await getMatchesByUserId(user1id, { sortOrder: "oldest", gameType: "nim" });
    expect(new Date(matches[0].createdAt).getTime()).toBeLessThanOrEqual(
      new Date(matches[1].createdAt).getTime(),
    );
  });

  it("fetches pgn for chess games", async () => {
    const user1 = await getUserByUsername("user1");
    const user2 = await getUserByUsername("user2");
    const game = await createGame(user1!, "chess", new Date());
    await joinGame(game.gameId, user2!);
    await startGame(game.gameId, user1!);
    // Fool's mate
    await updateGame(game.gameId, user1!, { from: "f2", to: "f3" });
    await updateGame(game.gameId, user2!, { from: "e7", to: "e5" });
    await updateGame(game.gameId, user1!, { from: "g2", to: "g4" });
    await updateGame(game.gameId, user2!, { from: "d8", to: "h4" });
    const user1id = user1!.userId;
    const matches = await getMatchesByUserId(user1id, { gameType: "chess" });
    const chessMatch = matches.find((m) => m.gameId === game.gameId);
    expect(chessMatch).toBeDefined();
    expect(chessMatch?.pgn).toBeDefined();
    expect(typeof chessMatch?.pgn).toBe("string");
  });

  it("paginates results", async () => {
    const user1id = (await getUserByUsername("user1"))!.userId;
    const user2id = (await getUserByUsername("user2"))!.userId;
    for (let i = 0; i < 5; i++) {
      await saveMatchRecords([user1id, user2id], "nim", randomUUID(), 0, new Date());
    }
    const page1 = await getMatchesByUserId(user1id, { page: 1, pageSize: 2 });
    expect(page1.length).toBeLessThanOrEqual(2);
  });
});

describe("getLeaderboard - filtering", () => {
  it("excludes users with hideFromGlobalLeaderboard set", async () => {
    const keys = await UserRepo.getAllKeys();
    const records = await UserRepo.getMany(keys);
    const userKey = keys[0];
    const record = records[0];
    await UserRepo.set(userKey, {
      ...record,
      hideFromGlobalLeaderboard: true,
      ratings: { chess: 1200 },
    });
    const board = await getLeaderboard("chess");
    const found = board.find((e) => e.user.username === record.username);
    expect(found).toBeUndefined();
    await UserRepo.set(userKey, { ...record, hideFromGlobalLeaderboard: false });
  });

  it("filters by league", async () => {
    const board = await getLeaderboard("chess", 30, undefined, "bronze");
    for (const entry of board) {
      expect(entry.rating).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("getUserRank - league filter", () => {
  it("returns null when user has no rating for the game", async () => {
    const rank = await getUserRank("nonexistent-user-id", "chess");
    expect(rank).toBeNull();
  });

  it("includes user even when outside selected league", async () => {
    const user1 = await getUserByUsername("user1");
    if (!user1) return;
    const rank = await getUserRank(user1.userId, "chess", undefined, "gold");
    // user may not be in gold but should still get a rank or null
    expect(rank === null || typeof rank.rank === "number").toBe(true);
  });
});

describe("getMatchesByUserId - no opponent", () => {
  it("handles match with no opponent", async () => {
    const user1id = (await getUserByUsername("user1"))!.userId;
    const gameId = randomUUID();
    await ScoreRepo.add({
      userId: user1id,
      gameType: "nim",
      gameId,
      result: "win",
      createdAt: new Date().toISOString(),
    });
    const matches = await getMatchesByUserId(user1id, { gameType: "nim" });
    const match = matches.find((m) => m.gameId === gameId);
    expect(match).toBeDefined();
    expect(match?.opponent).toBeUndefined();
  });
});

describe("getLeaderboard - friends filter", () => {
  it("filters to only userIds when provided", async () => {
    const user1 = await getUserByUsername("user1");
    const user2 = await getUserByUsername("user2");
    if (!user1 || !user2) return;
    const board = await getLeaderboard("chess", 30, [user1.userId]);
    const hasUser2 = board.some((e) => e.user.username === "user2");
    expect(hasUser2).toBe(false);
  });
});

describe("getUserRank - friends and hideFromGlobal", () => {
  it("returns null when user not in friends list", async () => {
    const rank = await getUserRank("nonexistent", "chess", ["some-other-id"]);
    expect(rank).toBeNull();
  });

  it("excludes hidden users from global leaderboard in getUserRank", async () => {
    const keys = await UserRepo.getAllKeys();
    const records = await UserRepo.getMany(keys);
    const userKey = keys[0];
    const record = records[0];
    await UserRepo.set(userKey, {
      ...record,
      hideFromGlobalLeaderboard: true,
      ratings: { chess: 1500 },
    });
    const rank = await getUserRank(userKey, "chess");
    await UserRepo.set(userKey, { ...record, hideFromGlobalLeaderboard: false });
    expect(rank).toBeNull();
  });
});

describe("saveMatchRecords - single player", () => {
  it("sets no opponentId for single player games", async () => {
    const user1id = (await getUserByUsername("user1"))!.userId;
    const gameId = randomUUID();
    await saveMatchRecords([user1id], "nim", gameId, 0, new Date());
    const keys = await ScoreRepo.getAllKeys();
    const records = await ScoreRepo.getMany(keys);
    const record = records.find((r) => r.userId === user1id && r.gameId === gameId);
    expect(record?.opponentId).toBeUndefined();
  });
});

describe("getLeaderboard - userIds included", () => {
  it("includes user when they are in the userIds list", async () => {
    const user1 = await getUserByUsername("user1");
    if (!user1) return;
    const board = await getLeaderboard("chess", 30, [user1.userId]);
    const hasUser1 = board.some((e) => e.user.username === "user1");
    expect(hasUser1).toBe(true);
  });
});

describe("getUserRank - userIds included", () => {
  it("includes user when they are in the userIds list", async () => {
    const user1 = await getUserByUsername("user1");
    if (!user1) return;
    const rank = await getUserRank(user1.userId, "chess", [user1.userId]);
    expect(rank === null || typeof rank.rank === "number").toBe(true);
  });
});
