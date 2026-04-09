import { describe, expect, it, vi } from "vitest";
import { saveMatchRecords } from "../../src/services/score.service.ts";
import { getUserByUsername } from "../../src/services/auth.service.ts";
import { ScoreRepo } from "../../src/repository.ts";
import type { GameServer } from "../../src/types.ts";
import { randomUUID } from "node:crypto";

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
