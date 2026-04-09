import { z } from "zod";

export type ChessTimeControl = 5 | 10 | 30 | null;

export interface ChessState {
  fen: string;
  pgn: string;
  nextPlayer: 0 | 1;
  status: "active" | "checkmate" | "stalemate" | "draw" | "timeout" | "resigned";
  inCheck: boolean;
  timeControl: ChessTimeControl;
  timeRemaining: [number, number];
  lastMoveAt: number | null;
}

export type ChessView = ChessState;

export type ChessMove = z.infer<typeof zChessMove>;
export const zChessMove = z.union([
  z.object({ from: z.string(), to: z.string(), promotion: z.string().optional() }),
  z.object({ resign: z.literal(true) }),
]);
