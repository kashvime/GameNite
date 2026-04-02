import { Chess } from "chess.js";
import { type ChessState, type ChessView, zChessMove } from "@gamenite/shared";
import { type GameLogic } from "./gameLogic.ts";
import { GameService } from "./gameServiceManager.ts";

export const chessLogic: GameLogic<ChessState, ChessView> = {
  minPlayers: 2,
  maxPlayers: 2,

  start: () => {
    const chess = new Chess();
    return {
      fen: chess.fen(),
      pgn: chess.pgn(),
      nextPlayer: 0,
      status: "active",
      inCheck: false,
    };
  },

  update: (state, payload, playerIndex) => {
    if (playerIndex !== state.nextPlayer) return null;
    if (state.status !== "active") return null;

    const move = zChessMove.safeParse(payload);
    if (move.error) return null;

    const chess = new Chess(state.fen);
    try {
      chess.move({ from: move.data.from, to: move.data.to, promotion: move.data.promotion ?? "q" });
    } catch {
      return null;
    }

    const nextPlayer: 0 | 1 = state.nextPlayer === 0 ? 1 : 0;
    let status: ChessState["status"] = "active";
    if (chess.isCheckmate()) status = "checkmate";
    else if (chess.isStalemate()) status = "stalemate";
    else if (chess.isDraw()) status = "draw";

    return {
      fen: chess.fen(),
      pgn: chess.pgn(),
      nextPlayer,
      status,
      inCheck: chess.inCheck(),
    };
  },

  isDone: (state) => state.status !== "active",

  winner: (state) => {
    if (state.status === "checkmate") {
      // The player who just moved won — that's the opposite of nextPlayer
      return state.nextPlayer === 0 ? 1 : 0;
    }
    return null; // draw or stalemate
  },

  viewAs: (state) => state,

  tagView: (view) => ({ type: "chess", view }),

  describeMove: (prevState, _newState, payload) => {
    const move = zChessMove.safeParse(payload);
    if (move.error) return " made a move";
    const chess = new Chess(prevState.fen);
    try {
      const result = chess.move({
        from: move.data.from,
        to: move.data.to,
        promotion: move.data.promotion ?? "q",
      });
      return ` played ${result.san}`;
    } catch {
      return " made a move";
    }
  },
};

export const chessGameService = new GameService<ChessState, ChessView>(chessLogic);
