import "./Game.css";
import { useParams } from "react-router-dom";
import { getGameById } from "../services/gameService.ts";
import { useEffect, useState } from "react";
import type { GameInfo } from "@gamenite/shared";
import ChatPanel from "../components/ChatPanel.tsx";
import GamePanel from "../components/GamePanel.tsx";

export default function Game() {
  const { gameId } = useParams();
  const [game, setGame] = useState<GameInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const game = await getGameById(gameId!);
      if (ignore || "error" in game) return;
      setGame(game);
    })();
    return () => {
      ignore = true;
    };
  }, [gameId]);

  const handleCopy = () => {
    if (!game?.inviteCode) return;
    navigator.clipboard.writeText(game.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    game && (
      <>
        {game.visibility === "private" && game.inviteCode && (
          <div
            style={{
              padding: "0.5rem 1rem",
              background: "var(--gray-background)",
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
            }}
          >
            <span className="smallAndGray">Invite code:</span>
            <strong>{game.inviteCode}</strong>
            <button className="secondary narrow" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
        <div className="gameContainer">
          <GamePanel {...game} />
          <ChatPanel chatId={game.chat} />
        </div>
      </>
    )
  );
}
