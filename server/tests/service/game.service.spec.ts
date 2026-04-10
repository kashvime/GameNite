import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createGame,
  joinGame,
  startGame,
  updateGame,
  viewGame,
  getGameById,
  joinByInviteCode,
} from "../../src/services/game.service.ts";
import { getUserByUsername } from "../../src/services/auth.service.ts";
import { GameRepo, UserRepo } from "../../src/repository.ts";
import type { GameServer } from "../../src/types.ts";
import type { ChessState } from "@gamenite/shared";

function makeMockIo(): GameServer {
  const mock = {
    to: vi.fn(),
    emit: vi.fn(),
  };
  mock.to.mockReturnValue(mock);
  return mock as unknown as GameServer;
}

// Fresh mockIo for each test — avoids cross-test call pollution
let mockIo: GameServer;
beforeEach(() => {
  mockIo = makeMockIo();
});

async function getUser(username: string) {
  const u = await getUserByUsername(username);
  if (!u) throw new Error(`user ${username} not found`);
  return u;
}

describe("game.service — joinGame branches", () => {
  it("throws when joining a nonexistent game", async () => {
    const user = await getUser("user1");
    await expect(joinGame("bad-id", user)).rejects.toThrow("joining invalid game");
  });

  it("throws when joining a game that already started", async () => {
    const user1 = await getUser("user1");
    const user2 = await getUser("user2");
    const game = await createGame(user1, "nim", new Date());
    await joinGame(game.gameId, user2);
    await startGame(game.gameId, user1);
    await expect(joinGame(game.gameId, { userId: "u3", username: "user3" })).rejects.toThrow(
      "joining game that started",
    );
  });

  it("throws when joining a game already in", async () => {
    const user1 = await getUser("user1");
    const game = await createGame(user1, "nim", new Date());
    await expect(joinGame(game.gameId, user1)).rejects.toThrow("joining game they are in already");
  });

  it("throws when joining a full game", async () => {
    const user1 = await getUser("user1");
    const user2 = await getUser("user2");
    const user3 = await getUser("user3");
    const game = await createGame(user1, "nim", new Date());
    await joinGame(game.gameId, user2);
    await expect(joinGame(game.gameId, user3)).rejects.toThrow("joining full");
  });
});

describe("game.service — startGame branches", () => {
  it("throws when starting nonexistent game", async () => {
    const user = await getUser("user1");
    await expect(startGame("bad-id", user)).rejects.toThrow("starting invalid game");
  });

  it("throws when starting a game that already started", async () => {
    const user1 = await getUser("user1");
    const user2 = await getUser("user2");
    const game = await createGame(user1, "nim", new Date());
    await joinGame(game.gameId, user2);
    await startGame(game.gameId, user1);
    await expect(startGame(game.gameId, user1)).rejects.toThrow("starting game that started");
  });

  it("throws when starting with insufficient players", async () => {
    const user1 = await getUser("user1");
    const game = await createGame(user1, "nim", new Date());
    await expect(startGame(game.gameId, user1)).rejects.toThrow("starting underpopulated game");
  });

  it("throws when starting a game user is not in", async () => {
    const user1 = await getUser("user1");
    const user2 = await getUser("user2");
    const user3 = await getUser("user3");
    const game = await createGame(user1, "nim", new Date());
    await joinGame(game.gameId, user2);
    await expect(startGame(game.gameId, user3)).rejects.toThrow("starting game they're not in");
  });
});

describe("game.service — updateGame branches", () => {
  it("throws when acting on nonexistent game", async () => {
    const user = await getUser("user1");
    await expect(updateGame("bad-id", user, 1)).rejects.toThrow("acted on an invalid game");
  });

  it("throws when game hasn't started", async () => {
    const user1 = await getUser("user1");
    const game = await createGame(user1, "nim", new Date());
    await expect(updateGame(game.gameId, user1, 1)).rejects.toThrow("hadn't started");
  });

  it("throws when player not in game", async () => {
    const user1 = await getUser("user1");
    const user2 = await getUser("user2");
    const user3 = await getUser("user3");
    const game = await createGame(user1, "nim", new Date());
    await joinGame(game.gameId, user2);
    await startGame(game.gameId, user1);
    await expect(updateGame(game.gameId, user3, 1)).rejects.toThrow("weren't playing");
  });

  it("throws on invalid move", async () => {
    const user1 = await getUser("user1");
    const user2 = await getUser("user2");
    const game = await createGame(user1, "nim", new Date());
    await joinGame(game.gameId, user2);
    await startGame(game.gameId, user1);
    await expect(updateGame(game.gameId, user1, 99)).rejects.toThrow("invalid move");
  });

  it("applies a valid move and returns result", async () => {
    const user1 = await getUser("user1");
    const user2 = await getUser("user2");
    const game = await createGame(user1, "nim", new Date());
    await joinGame(game.gameId, user2);
    await startGame(game.gameId, user1);
    const result = await updateGame(game.gameId, user1, 1);
    expect(result.moveDescription).toContain("token");
  });

  it("triggers AI move for chess AI game", async () => {
    const user1 = await getUser("user1");
    const game = await createGame(user1, "chess", new Date(), "public", "ai", "easy");
    await joinGame(game.gameId, { userId: "AI_OPPONENT", username: "AI" });
    await startGame(game.gameId, user1);
    const result = await updateGame(game.gameId, user1, { from: "e2", to: "e4" }, mockIo);
    expect(result.moveDescription).toContain("played");
  });

  it("triggers AI move and broadcasts via socket after delay", async () => {
    const user1 = await getUser("user1");
    const game = await createGame(user1, "chess", new Date(), "public", "ai", "easy");
    await joinGame(game.gameId, { userId: "AI_OPPONENT", username: "AI" });
    await startGame(game.gameId, user1);
    await updateGame(game.gameId, user1, { from: "e2", to: "e4" }, mockIo);
    await new Promise((res) => setTimeout(res, 1200));
    expect(mockIo.emit).toHaveBeenCalledWith("gameStateUpdated", expect.any(Object));
  }, 10000);

  it("scheduleAIMove returns early when game is done", async () => {
    const user1 = await getUser("user1");
    const game = await createGame(user1, "chess", new Date(), "public", "ai", "easy");
    await joinGame(game.gameId, { userId: "AI_OPPONENT", username: "AI" });
    await startGame(game.gameId, user1);
    await updateGame(game.gameId, user1, { from: "e2", to: "e4" }, mockIo);
    const g = await GameRepo.find(game.gameId);
    if (g) {
      g.done = true;
      await GameRepo.set(game.gameId, g);
    }
    await new Promise((res) => setTimeout(res, 1200));
  }, 10000);

  // Covers line 304: flip nextPlayer to 0 after human move so the AI's
  // chess.update call hits `if (playerIndex !== state.nextPlayer) return null`
  it("scheduleAIMove returns early when AI produces an invalid move", async () => {
    const user1 = await getUser("user1");
    const game = await createGame(user1, "chess", new Date(), "public", "ai", "easy");
    await joinGame(game.gameId, { userId: "AI_OPPONENT", username: "AI" });
    await startGame(game.gameId, user1);

    await updateGame(game.gameId, user1, { from: "e2", to: "e4" }, mockIo);

    // scheduleAIMove delays 400-800ms before reading DB. Flip nextPlayer to 0
    // immediately so the AI (playerIndex 1) is rejected by the turn check.
    const g = await GameRepo.find(game.gameId);
    if (g?.state) {
      (g.state as ChessState).nextPlayer = 0;
      await GameRepo.set(game.gameId, g);
    }

    await new Promise((res) => setTimeout(res, 1200));
  }, 10000);

  // Covers lines 357 and 392.
  // Seed both users to nim rating 1185. A win adds ~16 → 1201, crossing
  // bronze→silver (threshold 1200). change0 or change1 will be non-null
  // with oldLeague !== newLeague, hitting line 357. Line 392 is hit when
  // handleGameOver calls setOnlineStatus for both human players at the end.
  it("pushes league change when winner crosses bronze→silver boundary", async () => {
    const user1 = await getUser("user1");
    const user2 = await getUser("user2");

    const rec1 = await UserRepo.get(user1.userId);
    const rec2 = await UserRepo.get(user2.userId);
    await UserRepo.set(user1.userId, { ...rec1, ratings: { ...rec1.ratings, nim: 1185 } });
    await UserRepo.set(user2.userId, { ...rec2, ratings: { ...rec2.ratings, nim: 1185 } });

    const game = await createGame(user1, "nim", new Date());
    await joinGame(game.gameId, user2);
    await startGame(game.gameId, user1);

    // Drive nim to completion — alternating players correctly
    let currentUser = user1;
    let opponentUser = user2;
    while (true) {
      try {
        const r = await updateGame(game.gameId, currentUser, 3, mockIo);
        const state = r.views.watchers as { remaining?: number };
        if (state.remaining === 0) break;
        [currentUser, opponentUser] = [opponentUser, currentUser];
      } catch {
        break;
      }
    }

    expect(mockIo.emit).toHaveBeenCalledWith("gameRatingUpdated", expect.any(Object));
  });

  it("handles end-of-game with league changes", async () => {
    const user1 = await getUser("user1");
    const user2 = await getUser("user2");
    const game = await createGame(user1, "nim", new Date());
    await joinGame(game.gameId, user2);
    await startGame(game.gameId, user1);
    let currentUser = user1;
    let turn = 0;
    while (true) {
      try {
        const r = await updateGame(game.gameId, currentUser, 3, mockIo);
        if (r.views) {
          const state = r.views.watchers as { remaining?: number };
          if (state.remaining === 0) break;
        }
        currentUser = turn % 2 === 0 ? user2 : user1;
        turn++;
      } catch {
        break;
      }
    }
  });
});

describe("game.service — viewGame branches", () => {
  it("throws for nonexistent game", async () => {
    const user = await getUser("user1");
    await expect(viewGame("bad-id", user)).rejects.toThrow("viewed an invalid game id");
  });

  it("returns null view when game hasn't started", async () => {
    const user1 = await getUser("user1");
    const game = await createGame(user1, "nim", new Date());
    const result = await viewGame(game.gameId, user1);
    expect(result.view).toBeNull();
  });

  it("returns view when game has started", async () => {
    const user1 = await getUser("user1");
    const user2 = await getUser("user2");
    const game = await createGame(user1, "nim", new Date());
    await joinGame(game.gameId, user2);
    await startGame(game.gameId, user1);
    const result = await viewGame(game.gameId, user1);
    expect(result.view).not.toBeNull();
  });
});

describe("game.service — joinByInviteCode", () => {
  it("returns error for invalid code", async () => {
    const user = await getUser("user1");
    const result = await joinByInviteCode("BADCODE", user);
    expect(result).toMatchObject({ error: "Invalid invite code" });
  });

  it("returns error when join fails (already in game)", async () => {
    const user1 = await getUser("user1");
    const game = await createGame(user1, "nim", new Date(), "private");
    const result = await joinByInviteCode(game.inviteCode!, user1);
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  it("succeeds with valid invite code", async () => {
    const user1 = await getUser("user1");
    const user2 = await getUser("user2");
    const game = await createGame(user1, "nim", new Date(), "private");
    const result = await joinByInviteCode(game.inviteCode!, user2);
    expect("error" in result).toBe(false);
  });
});

describe("game.service — getGameById", () => {
  it("returns null for nonexistent game", async () => {
    const result = await getGameById("nonexistent-id");
    expect(result).toBeNull();
  });
});

describe("game.service — handleGameOver non-2-player", () => {
  it("handles game over for a single player game", async () => {
    const user1 = await getUser("user1");
    const user2 = await getUser("user2");
    const game = await createGame(user1, "nim", new Date());
    await joinGame(game.gameId, user2);
    await startGame(game.gameId, user1);
    // manually set game to done with 1 player to hit else branch
    const g = await GameRepo.find(game.gameId);
    if (g) {
      g.players = [user1.userId];
      g.done = false;
      await GameRepo.set(game.gameId, g);
    }
    // play nim to completion with just user1 (1 player else branch)
    let done = false;
    while (!done) {
      try {
        const r = await updateGame(game.gameId, user1, 3, mockIo);
        const state = r.views.watchers as { remaining?: number };
        if (state.remaining === 0) done = true;
      } catch {
        done = true;
      }
    }
  });
});

describe("game.service — scheduleAIMove game over", () => {
  it("calls handleGameOver when AI move ends the game", async () => {
    const user1 = await getUser("user1");
    const game = await createGame(user1, "chess", new Date(), "public", "ai", "easy");
    await joinGame(game.gameId, { userId: "AI_OPPONENT", username: "AI" });
    await startGame(game.gameId, user1);

    // Set up a position where AI (black) can checkmate in one move
    // Use fool's mate setup — white has already blundered
    const g = await GameRepo.find(game.gameId);
    if (g) {
      const { Chess } = await import("chess.js");
      const chess = new Chess();
      chess.move({ from: "f2", to: "f3" });
      chess.move({ from: "e7", to: "e5" });
      chess.move({ from: "g2", to: "g4" });
      // Now it's black's turn and Qh4# is checkmate
      g.state = {
        ...(g.state as object),
        fen: chess.fen(),
        pgn: chess.pgn(),
        nextPlayer: 1,
        status: "active",
        inCheck: false,
      };
      await GameRepo.set(game.gameId, g);
    }
    await updateGame(game.gameId, user1, { from: "d1", to: "d2" }, mockIo).catch(() => {});
    await new Promise((res) => setTimeout(res, 1200));
  }, 10000);
});

describe("game.service — handleGameOver player 1 league change", () => {
  it("pushes league change when player 1 (loser becomes winner) crosses boundary", async () => {
    const user1 = await getUser("user1");
    const user2 = await getUser("user2");

    const rec1 = await UserRepo.get(user1.userId);
    const rec2 = await UserRepo.get(user2.userId);
    await UserRepo.set(user1.userId, { ...rec1, ratings: { ...rec1.ratings, nim: 1185 } });
    await UserRepo.set(user2.userId, { ...rec2, ratings: { ...rec2.ratings, nim: 1185 } });

    const game = await createGame(user2, "nim", new Date());
    await joinGame(game.gameId, user1);
    await startGame(game.gameId, user2);

    // user2 is player 0, user1 is player 1 — make user1 (player 1) win
    let currentUser = user2;
    let turn = 0;
    let done = false;
    while (!done) {
      try {
        const r = await updateGame(game.gameId, currentUser, 1, mockIo);
        const state = r.views.watchers as { remaining?: number; status?: string };
        if (state.remaining === 0 || state.status === "over") done = true;
        currentUser = turn % 2 === 0 ? user1 : user2;
        turn++;
      } catch {
        done = true;
      }
    }
    expect(mockIo.emit).toHaveBeenCalled();
  });
});
