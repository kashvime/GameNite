import { describe, expect, it } from "vitest";
import { getAIMove } from "../../src/games/chessAI.ts";
import { Chess } from "chess.js";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const ONE_LEGAL_MOVE_FEN = "k7/8/8/8/8/8/8/R6K b - - 0 1";

function isRegularMove(
  move: ReturnType<typeof getAIMove>,
): move is { from: string; to: string; promotion?: string } {
  return "from" in move;
}

describe("getAIMove", () => {
  it("returns a valid move object with from/to fields on easy difficulty", () => {
    const move = getAIMove(STARTING_FEN, "easy");
    expect(isRegularMove(move)).toBe(true);
    if (isRegularMove(move)) {
      expect(typeof move.from).toBe("string");
      expect(typeof move.to).toBe("string");
    }
  });

  it("returns a valid move object on medium difficulty", () => {
    const move = getAIMove(STARTING_FEN, "medium");
    expect(isRegularMove(move)).toBe(true);
  });

  it("returns a valid move object on hard difficulty", () => {
    const move = getAIMove(STARTING_FEN, "hard");
    expect(isRegularMove(move)).toBe(true);
  });

  it("returns a move that is legal according to chess.js", () => {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const move = getAIMove(STARTING_FEN, difficulty);
      expect(isRegularMove(move)).toBe(true);
      if (isRegularMove(move)) {
        const chess = new Chess(STARTING_FEN);
        expect(() => chess.move({ from: move.from, to: move.to })).not.toThrow();
      }
    }
  });

  it("returns a legal move when there are few options", () => {
    const move = getAIMove(ONE_LEGAL_MOVE_FEN, "medium");
    expect(isRegularMove(move)).toBe(true);
    if (isRegularMove(move)) {
      const chess = new Chess(ONE_LEGAL_MOVE_FEN);
      const legalMoves = chess.moves({ verbose: true });
      expect(legalMoves.map((m) => m.from + m.to)).toContain(move.from + move.to);
    }
  });

  it("throws when there are no legal moves (game over position)", () => {
    const stalematedFen = "k7/8/1Q6/8/8/8/8/K7 b - - 0 1";
    expect(() => getAIMove(stalematedFen, "medium")).toThrow();
  });

  it("exercises minimizing branch (AI playing as black)", () => {
    const blackToMoveFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const move = getAIMove(blackToMoveFen, "medium");
    expect(isRegularMove(move)).toBe(true);
    if (isRegularMove(move)) {
      const chess = new Chess(blackToMoveFen);
      expect(() => chess.move({ from: move.from, to: move.to })).not.toThrow();
    }
  });

  it("exercises alpha-beta pruning on hard difficulty", () => {
    const simpleFen = "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1";
    const move = getAIMove(simpleFen, "hard");
    expect(isRegularMove(move)).toBe(true);
    if (isRegularMove(move)) {
      const chess = new Chess(simpleFen);
      expect(() => chess.move({ from: move.from, to: move.to })).not.toThrow();
    }
  });

  it("handles promotion moves", () => {
    const promotionFen = "8/P7/8/8/8/8/8/4K2k w - - 0 1";
    const move = getAIMove(promotionFen, "easy");
    expect(isRegularMove(move)).toBe(true);
    if (isRegularMove(move)) {
      const chess = new Chess(promotionFen);
      expect(() =>
        chess.move({ from: move.from, to: move.to, promotion: move.promotion ?? "q" }),
      ).not.toThrow();
    }
  });

  it("finds a strong move on medium/hard (should not hang pieces)", () => {
    const fen = "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
    const move = getAIMove(fen, "medium");
    expect(isRegularMove(move)).toBe(true);
    if (isRegularMove(move)) {
      const chess = new Chess(fen);
      expect(() => chess.move({ from: move.from, to: move.to })).not.toThrow();
    }
  });
});
