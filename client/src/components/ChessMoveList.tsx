import { useState } from "react";
import { Chess } from "chess.js";
import "./ChessMoveList.css";

interface ChessMoveListProps {
  pgn: string;
}

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

function getPositions(pgn: string): string[] {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    return [new Chess().fen()];
  }
  const history = chess.history();
  const positions: string[] = [];
  const replay = new Chess();
  positions.push(replay.fen());
  for (const san of history) {
    try {
      replay.move(san);
      positions.push(replay.fen());
    } catch {
      break;
    }
  }
  return positions;
}

function parseMoves(pgn: string): string[] {
  return pgn
    .replace(/\[.*?\]/g, "")
    .trim()
    .split(/\s+/)
    .filter((t) => !t.match(/^\d+\./) && t !== "*" && t.length > 0);
}

export default function ChessMoveList({ pgn }: ChessMoveListProps) {
  console.log("PGN received:", pgn);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);

  const moves = parseMoves(pgn);
  const positions = open ? getPositions(pgn) : [];
  const currentFen = cursor !== null ? positions[cursor] : positions[positions.length - 1];
  const pieces = currentFen ? parseFen(currentFen) : {};

  return (
    <div className="chess-move-list">
      <button
        className="chess-move-toggle"
        onClick={() => {
          setOpen((o) => !o);
          setCursor(null);
        }}
      >
        {open ? "Hide" : "Replay"} ({Math.ceil(moves.length / 2)} moves)
      </button>
      {open && (
        <div className="chess-replay">
          <div className="chess-replay-board">
            {RANKS.map((rank) => (
              <div key={rank} className="chess-replay-row">
                {FILES.map((file) => {
                  const square = file + rank;
                  const piece = pieces[square];
                  const isLight = (FILES.indexOf(file) + RANKS.indexOf(rank)) % 2 === 0;
                  return (
                    <div key={square} className={"chess-replay-sq " + (isLight ? "light" : "dark")}>
                      {piece && pieceSymbols[piece]}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="chess-replay-controls">
            <button onClick={() => setCursor(0)} disabled={cursor === 0}>
              ⏮
            </button>
            <button
              onClick={() => setCursor((c) => Math.max(0, (c ?? positions.length - 1) - 1))}
              disabled={cursor === 0}
            >
              ◀
            </button>
            <button
              onClick={() => setCursor((c) => Math.min(positions.length - 1, (c ?? 0) + 1))}
              disabled={cursor === positions.length - 1}
            >
              ▶
            </button>
            <button
              onClick={() => setCursor(positions.length - 1)}
              disabled={cursor === positions.length - 1 || cursor === null}
            >
              ⏭
            </button>
          </div>

          <div className="chess-move-grid">
            {Array.from({ length: Math.ceil(moves.length / 2) }, (_, i) => (
              <div key={i} className="chess-move-row">
                <span className="chess-move-num">{i + 1}.</span>
                <span
                  className={"chess-move-white" + (cursor === i * 2 + 1 ? " active" : "")}
                  onClick={() => setCursor(i * 2 + 1)}
                >
                  {moves[i * 2]}
                </span>
                <span
                  className={"chess-move-black" + (cursor === i * 2 + 2 ? " active" : "")}
                  onClick={() => setCursor(i * 2 + 2)}
                >
                  {moves[i * 2 + 1] ?? ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
