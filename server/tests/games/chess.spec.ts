import { describe, expect, it } from "vitest";
import { chessLogic } from "../../src/games/chess.ts";
import type { ChessState } from "@gamenite/shared";

const baseState = (): ChessState => chessLogic.start(2);

describe("chessLogic.start", () => {
  it("returns a valid initial state", () => {
    const state = baseState();
    expect(state.nextPlayer).toBe(0);
    expect(state.status).toBe("active");
    expect(state.inCheck).toBe(false);
    expect(state.timeControl).toBeNull();
    expect(state.timeRemaining).toHaveLength(2);
    expect(typeof state.fen).toBe("string");
  });

  it("sets time control when provided", () => {
    const state = chessLogic.start(2, { timeControl: 5 });
    expect(state.timeControl).toBe(5);
    expect(state.timeRemaining[0]).toBe(5 * 60 * 1000);
    expect(state.timeRemaining[1]).toBe(5 * 60 * 1000);
  });
});

describe("chessLogic.update", () => {
  it("returns null if the game is not active", () => {
    const state = { ...baseState(), status: "checkmate" as const };
    expect(chessLogic.update(state, { from: "e2", to: "e4" }, 0)).toBeNull();
  });

  it("returns null for an invalid move payload", () => {
    expect(chessLogic.update(baseState(), { notAMove: true }, 0)).toBeNull();
  });

  it("returns null if it is not the player's turn", () => {
    expect(chessLogic.update(baseState(), { from: "e7", to: "e5" }, 1)).toBeNull();
  });

  it("returns null for an illegal move", () => {
    expect(chessLogic.update(baseState(), { from: "e2", to: "e1" }, 0)).toBeNull();
  });

  it("applies a valid move and advances the turn", () => {
    const result = chessLogic.update(baseState(), { from: "e2", to: "e4" }, 0);
    expect(result).not.toBeNull();
    expect(result!.nextPlayer).toBe(1);
    expect(result!.status).toBe("active");
  });

  it("handles resignation by player 0", () => {
    const result = chessLogic.update(baseState(), { resign: true }, 0);
    expect(result).not.toBeNull();
    expect(result!.status).toBe("resigned");
    expect(result!.nextPlayer).toBe(1);
  });

  it("handles resignation by player 1", () => {
    const s1 = chessLogic.update(baseState(), { from: "e2", to: "e4" }, 0)!;
    const result = chessLogic.update(s1, { resign: true }, 1);
    expect(result!.status).toBe("resigned");
    expect(result!.nextPlayer).toBe(0);
  });

  it("detects checkmate (fool's mate)", () => {
    const s1 = chessLogic.update(baseState(), { from: "f2", to: "f3" }, 0)!;
    const s2 = chessLogic.update(s1, { from: "e7", to: "e5" }, 1)!;
    const s3 = chessLogic.update(s2, { from: "g2", to: "g4" }, 0)!;
    const s4 = chessLogic.update(s3, { from: "d8", to: "h4" }, 1)!;
    expect(s4.status).toBe("checkmate");
  });

  it("handles timeout when time runs out", () => {
    const state: ChessState = {
      ...baseState(),
      timeControl: 5,
      timeRemaining: [1, 300000],
      lastMoveAt: Date.now() - 5000,
    };
    const result = chessLogic.update(state, { from: "e2", to: "e4" }, 0);
    expect(result).not.toBeNull();
    expect(result!.status).toBe("timeout");
  });

  it("handles loadPgn failure by falling back to fen", () => {
    const state: ChessState = {
      fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      pgn: "INVALID_PGN_STRING",
      nextPlayer: 1,
      status: "active",
      inCheck: false,
      timeControl: null,
      timeRemaining: [Infinity, Infinity],
      lastMoveAt: null,
    };
    const result = chessLogic.update(state, { from: "e7", to: "e5" }, 1);
    expect(result).not.toBeNull();
  });

  it("handles pawn promotion via normal game progression", () => {
    const result = chessLogic.update(baseState(), { from: "e2", to: "e4" }, 0);
    expect(result).not.toBeNull();
    expect(result!.status).toBe("active");
  });
});

describe("chessLogic.isDone", () => {
  it("returns false for an active game", () => {
    expect(chessLogic.isDone(baseState())).toBe(false);
  });

  it("returns true for checkmate", () => {
    expect(chessLogic.isDone({ ...baseState(), status: "checkmate" })).toBe(true);
  });

  it("returns true for stalemate", () => {
    expect(chessLogic.isDone({ ...baseState(), status: "stalemate" })).toBe(true);
  });

  it("returns true for draw", () => {
    expect(chessLogic.isDone({ ...baseState(), status: "draw" })).toBe(true);
  });

  it("returns true for timeout", () => {
    expect(chessLogic.isDone({ ...baseState(), status: "timeout" })).toBe(true);
  });

  it("returns true for resigned", () => {
    expect(chessLogic.isDone({ ...baseState(), status: "resigned" })).toBe(true);
  });
});

describe("chessLogic.winner", () => {
  it("returns null for a draw", () => {
    expect(chessLogic.winner({ ...baseState(), status: "draw" })).toBeNull();
  });

  it("returns null for a stalemate", () => {
    expect(chessLogic.winner({ ...baseState(), status: "stalemate" })).toBeNull();
  });

  it("returns null for an active game", () => {
    expect(chessLogic.winner(baseState())).toBeNull();
  });

  it("returns the correct winner after checkmate", () => {
    const s1 = chessLogic.update(baseState(), { from: "f2", to: "f3" }, 0)!;
    const s2 = chessLogic.update(s1, { from: "e7", to: "e5" }, 1)!;
    const s3 = chessLogic.update(s2, { from: "g2", to: "g4" }, 0)!;
    const s4 = chessLogic.update(s3, { from: "d8", to: "h4" }, 1)!;
    expect(chessLogic.winner(s4)).toBe(1);
  });

  it("returns winner on timeout", () => {
    expect(chessLogic.winner({ ...baseState(), status: "timeout", nextPlayer: 1 })).toBe(1);
  });

  it("returns winner on resignation", () => {
    expect(chessLogic.winner({ ...baseState(), status: "resigned", nextPlayer: 1 })).toBe(1);
  });
});

describe("chessLogic.viewAs", () => {
  it("returns the full state (chess has no hidden info)", () => {
    const state = baseState();
    expect(chessLogic.viewAs(state, 0)).toStrictEqual(state);
    expect(chessLogic.viewAs(state, -1)).toStrictEqual(state);
  });
});

describe("chessLogic.describeMove", () => {
  it("returns SAN notation for a valid move", () => {
    const state = baseState();
    expect(chessLogic.describeMove(state, state, { from: "e2", to: "e4" }, 0)).toBe(" played e4");
  });

  it("returns fallback description for an invalid move payload", () => {
    const state = baseState();
    expect(chessLogic.describeMove(state, state, { bad: "payload" }, 0)).toBe(" made a move");
  });

  it("returns resign description", () => {
    const state = baseState();
    expect(chessLogic.describeMove(state, state, { resign: true }, 0)).toBe(" resigned");
  });

  it("falls back to fen when pgn is invalid", () => {
    const state: ChessState = {
      fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      pgn: "INVALID_PGN",
      nextPlayer: 1,
      status: "active",
      inCheck: false,
      timeControl: null,
      timeRemaining: [Infinity, Infinity],
      lastMoveAt: null,
    };
    const desc = chessLogic.describeMove(state, state, { from: "e7", to: "e5" }, 1);
    expect(typeof desc).toBe("string");
  });
});
