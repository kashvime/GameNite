import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GameSummaryView from "../components/GameSummaryView.tsx";
import useGameList, { PAGE_SIZE } from "../hooks/useGameList.ts";
import { joinByCode } from "../services/gameService.ts";
import useAuth from "../hooks/useAuth.ts";

export default function GameList() {
  const [page, setPage] = useState(0);
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

  const games = "message" in gameList ? null : gameList;
  const totalPages = games ? Math.ceil(games.length / PAGE_SIZE) : 0;
  const visibleGames = games ? games.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : [];

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
            <>
              <div className="dottedList">
                {visibleGames.map((game) => (
                  <GameSummaryView {...game} key={game.gameId.toString()} />
                ))}
              </div>
              {totalPages > 1 && (
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                    marginTop: "1rem",
                  }}
                >
                  <button
                    className="secondary narrow"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 0}
                  >
                    Previous
                  </button>
                  <span>
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    className="secondary narrow"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </>
      </div>
    </div>
  );
}
