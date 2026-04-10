import { Chess } from "chess.js";
import {
  type ChessState,
  type ChessView,
  type ChessTimeControl,
  zChessMove,
} from "@gamenite/shared";
import { type GameLogic } from "./gameLogic.ts";
import { GameService } from "./gameServiceManager.ts";

export const chessLogic: GameLogic<ChessState, ChessView> = {
  minPlayers: 2,
  maxPlayers: 2,

  start: (numPlayers, options?: { timeControl?: ChessTimeControl }) => {
    const timeControl = options?.timeControl ?? null;
    const timeMs = timeControl ? timeControl * 60 * 1000 : Infinity;
    return {
      fen: new Chess().fen(),
      pgn: new Chess().pgn(),
      nextPlayer: 0,
      status: "active",
      inCheck: false,
      timeControl,
      timeRemaining: [timeMs, timeMs],
      lastMoveAt: Date.now(),
    };
  },

  update: (state, payload, playerIndex) => {
    if (state.status !== "active") return null;
    const move = zChessMove.safeParse(payload);
    if (move.error) return null;
    if ("resign" in move.data) {
      const winner: 0 | 1 = playerIndex === 0 ? 1 : 0;
      const now2 = Date.now();
      return {
        ...state,
        status: "resigned",
        nextPlayer: winner,
        lastMoveAt: now2,
      };
    }
    if (playerIndex !== state.nextPlayer) return null;

    const now = Date.now();
    const elapsed = state.lastMoveAt ? now - state.lastMoveAt : 0;
    const newTimeRemaining: [number, number] = [...state.timeRemaining];
    if (state.timeControl !== null) {
      newTimeRemaining[playerIndex] = Math.max(0, newTimeRemaining[playerIndex] - elapsed);
      if (newTimeRemaining[playerIndex] <= 0) {
        return {
          ...state,
          status: "timeout",
          timeRemaining: newTimeRemaining,
          lastMoveAt: now,
          nextPlayer: playerIndex === 0 ? 1 : 0,
        };
      }
    }

    const chess = new Chess();
    try {
      chess.loadPgn(state.pgn || "");
    } catch {
      chess.load(state.fen);
    }
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
      timeControl: state.timeControl,
      timeRemaining: newTimeRemaining,
      lastMoveAt: now,
    };
  },

  isDone: (state) => state.status !== "active",

  winner: (state) => {
    if (state.status === "checkmate") return state.nextPlayer === 0 ? 1 : 0;
    if (state.status === "timeout") return state.nextPlayer;
    if (state.status === "resigned") return state.nextPlayer;
    return null;
  },

  viewAs: (state) => state,
  tagView: (view) => ({ type: "chess", view }),

  describeMove: (prevState, _newState, payload) => {
    const move = zChessMove.safeParse(payload);
    if (move.error) return " made a move";
    if ("resign" in move.data) return " resigned";
    const chess = new Chess();
    try {
      chess.loadPgn(prevState.pgn || "");
    } catch {
      chess.load(prevState.fen);
    }
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
