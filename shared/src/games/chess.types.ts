import { z } from "zod";

/**
 * Represents the state of a chess game stored on the server.
 * - `fen`: the FEN string representing the board position
 * - `pgn`: the PGN string representing the move history
 * - `nextPlayer`: 0 for white, 1 for black
 * - `status`: current game status
 */
export interface ChessState {
  fen: string;
  pgn: string;
  nextPlayer: 0 | 1;
  status: "active" | "checkmate" | "stalemate" | "draw";
  inCheck: boolean;
}

/**
 * Represents what a player sees of the chess game.
 * Same as state for chess since there are no hidden elements.
 */
export type ChessView = ChessState;

/**
 * A chess move represented as from/to squares with optional promotion.
 * e.g. { from: "e2", to: "e4" }
 */
export type ChessMove = z.infer<typeof zChessMove>;
export const zChessMove = z.object({
  from: z.string(),
  to: z.string(),
  promotion: z.string().optional(),
});
