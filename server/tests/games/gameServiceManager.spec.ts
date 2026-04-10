import { describe, expect, it } from "vitest";
import { nimGameService } from "../../src/games/nim.ts";
import { chessGameService } from "../../src/games/chess.ts";
import { guessGameService } from "../../src/games/guess.ts";

const PLAYERS = ["player0", "player1"];

describe("GameService — nim", () => {
  it("exposes correct minPlayers and maxPlayers", () => {
    expect(nimGameService.minPlayers).toBe(2);
    expect(nimGameService.maxPlayers).toBe(2);
  });

  it("create() returns a valid initial state and views for all players", () => {
    const { state, views } = nimGameService.create(PLAYERS);
    expect(state).toBeDefined();
    expect(views.players).toHaveLength(2);
    expect(views.watchers).toBeDefined();
  });

  it("update() returns null for an invalid move", () => {
    const { state } = nimGameService.create(PLAYERS);
    expect(nimGameService.update(state, 99, 0, PLAYERS)).toBeNull();
  });

  it("update() returns updated state and views for a valid move", () => {
    const { state } = nimGameService.create(PLAYERS);
    const result = nimGameService.update(state, 3, 0, PLAYERS);
    expect(result).not.toBeNull();
    expect(result!.done).toBe(false);
    expect(result!.winner).toBeNull();
    expect(result!.views.players).toHaveLength(2);
    expect(result!.moveDescription).toContain("token");
  });

  it("update() reports done and winner when game ends", () => {
    let { state } = nimGameService.create(PLAYERS);
    // Play out a full game — take 3 each turn until 0 remain
    let turn = 0;
    while (true) {
      const s: typeof state = state as typeof state & { remaining: number };
      const remaining = (s as { remaining: number }).remaining;
      const take = Math.min(3, remaining);
      const result = nimGameService.update(state, take, turn % 2, PLAYERS);
      if (!result) break;
      state = result.state;
      if (result.done) {
        expect(result.winner).not.toBeNull();
        break;
      }
      turn++;
    }
  });

  it("view() returns a tagged view", () => {
    const { state } = nimGameService.create(PLAYERS);
    const view = nimGameService.view(state, 0);
    expect(view.type).toBe("nim");
  });

  it("view() throws when state is null", () => {
    expect(() => nimGameService.view(null, 0)).toThrow("Game state does not exist");
  });
});

describe("GameService — chess", () => {
  it("exposes correct minPlayers and maxPlayers", () => {
    expect(chessGameService.minPlayers).toBe(2);
    expect(chessGameService.maxPlayers).toBe(2);
  });

  it("create() returns a valid initial state and views", () => {
    const { state, views } = chessGameService.create(PLAYERS);
    expect(state).toBeDefined();
    expect(views.players).toHaveLength(2);
  });

  it("update() returns null for an invalid move", () => {
    const { state } = chessGameService.create(PLAYERS);
    expect(chessGameService.update(state, { from: "e2", to: "e9" }, 0, PLAYERS)).toBeNull();
  });

  it("update() applies a valid move and returns views", () => {
    const { state } = chessGameService.create(PLAYERS);
    const result = chessGameService.update(state, { from: "e2", to: "e4" }, 0, PLAYERS);
    expect(result).not.toBeNull();
    expect(result!.done).toBe(false);
    expect(result!.moveDescription).toBe(" played e4");
  });

  it("view() returns a tagged chess view", () => {
    const { state } = chessGameService.create(PLAYERS);
    const view = chessGameService.view(state, 0);
    expect(view.type).toBe("chess");
  });
});

describe("GameService — guess", () => {
  it("exposes correct minPlayers and maxPlayers", () => {
    expect(guessGameService.minPlayers).toBe(2);
    expect(guessGameService.maxPlayers).toBe(2);
  });

  it("create() returns a valid initial state and views", () => {
    const { state, views } = guessGameService.create(PLAYERS);
    expect(state).toBeDefined();
    expect(views.players).toHaveLength(2);
  });

  it("update() returns null for an invalid move", () => {
    const { state } = guessGameService.create(PLAYERS);
    expect(guessGameService.update(state, 999, 0, PLAYERS)).toBeNull();
  });

  it("update() applies a valid guess", () => {
    const { state } = guessGameService.create(PLAYERS);
    const result = guessGameService.update(state, 42, 0, PLAYERS);
    expect(result).not.toBeNull();
    expect(result!.views.players).toHaveLength(2);
  });

  it("view() returns a tagged guess view", () => {
    const { state } = guessGameService.create(PLAYERS);
    const view = guessGameService.view(state, 0);
    expect(view.type).toBe("guess");
  });
});
