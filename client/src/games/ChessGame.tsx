import { useState, useEffect, useRef } from "react";
import type { ChessMove, ChessView } from "@gamenite/shared";
import type { GameProps } from "../util/types.ts";
import "./ChessGame.css";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

const pieceSymbols: Record<string, string> = {
  wK: "♔",
  wQ: "♕",
  wR: "♖",
  wB: "♗",
  wN: "♘",
  wP: "♙",
  bK: "♚",
  bQ: "♛",
  bR: "♜",
  bB: "♝",
  bN: "♞",
  bP: "♟",
};

function parseFen(fen: string): Record<string, string> {
  const pieces: Record<string, string> = {};
  const rows = fen.split(" ")[0].split("/");
  rows.forEach((row, rankIndex) => {
    let fileIndex = 0;
    for (const ch of row) {
      if (isNaN(Number(ch))) {
        const color = ch === ch.toUpperCase() ? "w" : "b";
        const type = ch.toUpperCase();
        pieces[FILES[fileIndex] + RANKS[rankIndex]] = color + type;
        fileIndex++;
      } else {
        fileIndex += Number(ch);
      }
    }
  });
  return pieces;
}

function formatTime(ms: number) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ":" + s.toString().padStart(2, "0");
}

export default function ChessGame({
  view,
  players,
  userPlayerIndex,
  makeMove,
}: GameProps<ChessView, ChessMove>) {
  const [selected, setSelected] = useState<string | null>(null);
  const [promotionPending, setPromotionPending] = useState<{ from: string; to: string } | null>(
    null,
  );
  const isMyTurn = userPlayerIndex === view.nextPlayer;
  const isWhite = userPlayerIndex === 0;
  const isDone = view.status !== "active";

  const [displayTime, setDisplayTime] = useState<[number, number]>(view.timeRemaining);
  const prevFen = useRef(view.fen);
  if (prevFen.current !== view.fen) {
    prevFen.current = view.fen;
    setDisplayTime(view.timeRemaining);
  }

  useEffect(() => {
    if (view.timeControl === null || isDone) return;
    const interval = setInterval(() => {
      setDisplayTime((prev) => {
        const next: [number, number] = [prev[0], prev[1]];
        next[view.nextPlayer] = Math.max(0, next[view.nextPlayer] - 100);
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [view.nextPlayer, view.timeControl, isDone]);

  const pieces = parseFen(view.fen);
  const ranks = isWhite ? RANKS : [...RANKS].reverse();
  const files = isWhite ? FILES : [...FILES].reverse();

  function handleSquareClick(square: string) {
    if (!isMyTurn || isDone) return;
    if (selected === null) {
      if (pieces[square]) setSelected(square);
    } else if (selected === square) {
      setSelected(null);
    } else {
      const piece = pieces[selected];
      const isPawn = piece?.endsWith("P");
      const toRank = square[1];
      const isPromotion = isPawn && (toRank === "8" || toRank === "1");
      if (isPromotion) {
        setPromotionPending({ from: selected, to: square });
        setSelected(null);
      } else {
        makeMove({ from: selected, to: square });
        setSelected(null);
      }
    }
  }

  function handlePromotion(piece: string) {
    if (promotionPending) {
      makeMove({ from: promotionPending.from, to: promotionPending.to, promotion: piece });
      setPromotionPending(null);
    }
  }

  function statusMessage() {
    if (view.status === "checkmate") {
      const winner = view.nextPlayer === 0 ? 1 : 0;
      return "Checkmate! " + (players[winner]?.display ?? "Player " + (winner + 1)) + " wins!";
    }
    if (view.status === "timeout") {
      const winner = view.nextPlayer;
      return (players[winner]?.display ?? "Player " + (winner + 1)) + " wins on time!";
    }
    if (view.status === "stalemate") return "Stalemate — draw!";
    if (view.status === "draw") return "Draw!";
    if (view.inCheck)
      return (players[view.nextPlayer]?.display ?? "Current player") + " is in check!";
    if (!isMyTurn)
      return "Waiting for " + (players[view.nextPlayer]?.display ?? "opponent") + "...";
    return "Your turn";
  }

  const statusClass =
    view.status !== "active" ? "done" : view.inCheck ? "check" : isMyTurn ? "myturn" : "";

  return (
    <div className="chess-wrapper">
      <div className="chess-players">
        <div className={"chess-player" + (view.nextPlayer === 0 && !isDone ? " active" : "")}>
          <div className="chess-player-dot white" />
          {players[0]?.display ?? "Player 1"}
          {view.timeControl !== null && (
            <span
              className={
                "chess-clock" +
                (view.nextPlayer === 0 && !isDone ? " active" : "") +
                (displayTime[0] < 30000 ? " low" : "")
              }
            >
              {formatTime(displayTime[0])}
            </span>
          )}
        </div>
        <div className={"chess-player" + (view.nextPlayer === 1 && !isDone ? " active" : "")}>
          <div className="chess-player-dot black" />
          {players[1]?.display ?? "Player 2"}
          {view.timeControl !== null && (
            <span
              className={
                "chess-clock" +
                (view.nextPlayer === 1 && !isDone ? " active" : "") +
                (displayTime[1] < 30000 ? " low" : "")
              }
            >
              {formatTime(displayTime[1])}
            </span>
          )}
        </div>
      </div>

      <div className={"chess-status " + statusClass}>{statusMessage()}</div>

      {promotionPending && (
        <div className="chess-promotion">
          <span>Promote to:</span>
          {["q", "r", "b", "n"].map((p) => (
            <button key={p} onClick={() => handlePromotion(p)}>
              {pieceSymbols[isWhite ? "w" + p.toUpperCase() : "b" + p.toUpperCase()]}
            </button>
          ))}
        </div>
      )}

      <div className="chess-board-wrap">
        <div className="chess-board">
          {ranks.map((rank) => (
            <div key={rank} className="chess-row">
              <div className="chess-rank-label">{rank}</div>
              {files.map((file) => {
                const square = file + rank;
                const piece = pieces[square];
                const isLight = (FILES.indexOf(file) + RANKS.indexOf(rank)) % 2 === 0;
                const isSelected = selected === square;
                const squareClass = [
                  "chess-square",
                  isLight ? "light" : "dark",
                  isSelected ? "selected" : "",
                  isMyTurn && !isDone ? "clickable" : "",
                ].join(" ");
                return (
                  <div
                    key={square}
                    className={squareClass}
                    onClick={() => handleSquareClick(square)}
                  >
                    {piece && pieceSymbols[piece]}
                  </div>
                );
              })}
            </div>
          ))}
          <div className="chess-file-labels">
            <div className="chess-file-label-spacer" />
            {files.map((file) => (
              <div key={file} className="chess-file-label">
                {file}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
