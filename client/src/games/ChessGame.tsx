import { useState } from "react";
import type { ChessMove, ChessView } from "@gamenite/shared";
import type { GameProps } from "../util/types.ts";

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
        const square = FILES[fileIndex] + RANKS[rankIndex];
        pieces[square] = color + type;
        fileIndex++;
      } else {
        fileIndex += Number(ch);
      }
    }
  });
  return pieces;
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

  const pieces = parseFen(view.fen);
  const isMyTurn = userPlayerIndex === view.nextPlayer;
  const isWhite = userPlayerIndex === 0;
  const isDone = view.status !== "active";

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
      return `Checkmate! ${players[winner]?.display ?? `Player ${winner + 1}`} wins!`;
    }
    if (view.status === "stalemate") return "Stalemate — draw!";
    if (view.status === "draw") return "Draw!";
    if (view.inCheck)
      return `${players[view.nextPlayer]?.display ?? "Current player"} is in check!`;
    if (!isMyTurn) return `Waiting for ${players[view.nextPlayer]?.display ?? "opponent"}...`;
    return "Your turn";
  }

  return (
    <div className="content spacedSection">
      <h2>Chess</h2>

      {/* Player info */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <span>⬜ White: {players[0]?.display ?? "Player 1"}</span>
        <span>⬛ Black: {players[1]?.display ?? "Player 2"}</span>
      </div>

      {/* Status */}
      <div
        style={{
          marginBottom: "0.5rem",
          fontWeight: 500,
          color: view.inCheck ? "#a32d2d" : view.status !== "active" ? "#0f6e56" : undefined,
        }}
      >
        {statusMessage()}
      </div>

      {/* Promotion dialog */}
      {promotionPending && (
        <div
          style={{ marginBottom: "0.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}
        >
          <span>Promote pawn to:</span>
          {["q", "r", "b", "n"].map((p) => (
            <button key={p} className="secondary narrow" onClick={() => handlePromotion(p)}>
              {pieceSymbols[isWhite ? `w${p.toUpperCase()}` : `b${p.toUpperCase()}`]}
            </button>
          ))}
        </div>
      )}

      {/* Board */}
      <div
        style={{
          display: "inline-block",
          border: "2px solid #444",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        {ranks.map((rank) => (
          <div key={rank} style={{ display: "flex" }}>
            {/* Rank label */}
            <div
              style={{
                width: "20px",
                height: "56px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                background: "#b58863",
                color: "#fff",
              }}
            >
              {rank}
            </div>
            {files.map((file) => {
              const square = file + rank;
              const piece = pieces[square];
              const isLight = (FILES.indexOf(file) + RANKS.indexOf(rank)) % 2 === 0;
              const isSelected = selected === square;
              const bg = isSelected ? "#f6f669" : isLight ? "#f0d9b5" : "#b58863";

              return (
                <div
                  key={square}
                  onClick={() => handleSquareClick(square)}
                  style={{
                    width: "56px",
                    height: "56px",
                    background: bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "36px",
                    cursor: isMyTurn && !isDone ? "pointer" : "default",
                    userSelect: "none",
                  }}
                >
                  {piece && pieceSymbols[piece]}
                </div>
              );
            })}
          </div>
        ))}
        {/* File labels */}
        <div style={{ display: "flex", background: "#b58863" }}>
          <div style={{ width: "20px" }} />
          {files.map((file) => (
            <div
              key={file}
              style={{
                width: "56px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                color: "#fff",
              }}
            >
              {file}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
