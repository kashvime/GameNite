import { useState } from "react";
import "./ChessMoveList.css";

interface ChessMoveListProps {
  pgn: string;
}

function parseMoves(pgn: string): string[] {
  return pgn
    .replace(/\[.*?\]/g, "")
    .trim()
    .split(/\s+/)
    .filter((t) => !t.match(/^\d+\./) && t !== "*" && t.length > 0);
}

export default function ChessMoveList({ pgn }: ChessMoveListProps) {
  const [open, setOpen] = useState(false);
  const moves = parseMoves(pgn);

  return (
    <div className="chess-move-list">
      <button className="chess-move-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? "Hide" : "View"} moves ({Math.ceil(moves.length / 2)})
      </button>
      {open && (
        <div className="chess-move-grid">
          {Array.from({ length: Math.ceil(moves.length / 2) }, (_, i) => (
            <div key={i} className="chess-move-row">
              <span className="chess-move-num">{i + 1}.</span>
              <span className="chess-move-white">{moves[i * 2]}</span>
              <span className="chess-move-black">{moves[i * 2 + 1] ?? ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
