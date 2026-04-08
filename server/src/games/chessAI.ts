import { Chess } from "chess.js";
import { type AIDifficulty, type ChessMove } from "@gamenite/shared";

// Material value of each piece type
const pieceValue: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-square tables: encourage good square control and development.
// Index 0 = a8 (top-left from white's perspective), 63 = h1.
// For black pieces the index is mirrored (63 - idx).
const PST: Partial<Record<string, number[]>> = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5,
    10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20,
    -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10,
    0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10,
    5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0,
    -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10,
    -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0,
    0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0,
    5, 5, 0, 0, 0,
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0,
    0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20,
  ],
};

/** Static evaluation: positive = good for white, negative = good for black */
function evaluate(chess: Chess): number {
  if (chess.isCheckmate()) return chess.turn() === "w" ? -Infinity : Infinity;
  if (chess.isDraw()) return 0;

  let score = 0;
  chess.board().forEach((row, rank) => {
    row.forEach((sq, file) => {
      if (!sq) return;
      const idx = rank * 8 + file;
      const pstIdx = sq.color === "w" ? idx : 63 - idx;
      const material = pieceValue[sq.type] ?? 0;
      const positional = PST[sq.type]?.[pstIdx] ?? 0;
      const value = material + positional;
      score += sq.color === "w" ? value : -value;
    });
  });
  return score;
}

/** Minimax with alpha-beta pruning */
function minimax(
  chess: Chess,
  depth: number,
  alphaIn: number,
  betaIn: number,
  maximizing: boolean,
): number {
  if (depth === 0 || chess.isGameOver()) return evaluate(chess);

  const moves = chess.moves();
  let alpha = alphaIn;
  let beta = betaIn;
  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      chess.move(m);
      best = Math.max(best, minimax(chess, depth - 1, alpha, beta, false));
      chess.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      chess.move(m);
      best = Math.min(best, minimax(chess, depth - 1, alpha, beta, true));
      chess.undo();
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

const DEPTH: Record<AIDifficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

/**
 * Given a FEN string, return the best move the AI can find.
 * Returns a ChessMove ({ from, to, promotion? }) matching your existing move format.
 */
export function getAIMove(fen: string, difficulty: AIDifficulty): ChessMove {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });

  if (!moves.length) throw new Error("getAIMove called with no legal moves");

  // Easy: pick a random legal move
  if (difficulty === "easy") {
    const m = moves[Math.floor(Math.random() * moves.length)];
    return { from: m.from, to: m.to, promotion: m.promotion };
  }

  const depth = DEPTH[difficulty];
  const maximizing = chess.turn() === "w";
  let bestMove = moves[0];
  let bestScore = maximizing ? -Infinity : Infinity;

  for (const m of moves) {
    chess.move(m);
    const score = minimax(chess, depth - 1, -Infinity, Infinity, !maximizing);
    chess.undo();
    if (maximizing ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = m;
    }
  }

  return { from: bestMove.from, to: bestMove.to, promotion: bestMove.promotion };
}
