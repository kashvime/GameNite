import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GameSummaryView from "../components/GameSummaryView.tsx";
import useGameList from "../hooks/useGameList.ts";
import { joinByCode } from "../services/gameService.ts";
import useAuth from "../hooks/useAuth.ts";

export default function GameList() {
  const gameList = useGameList();
  const navigate = useNavigate();
  const auth = useAuth();
  const [code, setCode] = useState("");
  const [codeErr, setCodeErr] = useState<string | null>(null);

  const handleJoinByCode = async () => {
    setCodeErr(null);
    const result = await joinByCode(auth, code);
    if ("error" in result) {
      setCodeErr(result.error);
      return;
    }
    navigate(`/game/${result.gameId}`);
  };

  return (
    <div className="content">
      <div className="spacedSection">
        <h2>All games</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="primary narrow" onClick={() => navigate("/game/new")}>
              Create New Game
            </button>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              className="widefill"
              style={{ maxWidth: "200px" }}
              type="text"
              placeholder="Invite code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <button className="secondary narrow" onClick={handleJoinByCode}>
              Join Private Game
            </button>
          </div>
          {codeErr && <p className="error-message">{codeErr}</p>}
        </div>
        <>
          {"message" in gameList ? (
            gameList.message
          ) : (
            <div className="dottedList">
              {gameList.map((game) => (
                <GameSummaryView {...game} key={game.gameId.toString()} />
              ))}
            </div>
          )}
        </>
      </div>
    </div>
  );
}
