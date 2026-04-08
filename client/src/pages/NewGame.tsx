import useNewGameForm from "../hooks/useNewGameForm.ts";
import { gameNames } from "../util/consts.ts";

export default function NewGame() {
  const {
    gameKey,
    visibility,
    setVisibility,
    gameMode,
    setGameMode,
    aiDifficulty,
    setAiDifficulty,
    err,
    handleInputChange,
    handleSubmit,
  } = useNewGameForm();

  return (
    <form className="content spacedSection" onSubmit={handleSubmit}>
      <h2>Create new game</h2>
      <div>
        <select value={gameKey} aria-label="Game selection" onChange={(e) => handleInputChange(e)}>
          <option value="">— Select a game —</option>
          {Object.entries(gameNames).map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <select
          value={visibility}
          aria-label="Visibility"
          onChange={(e) => setVisibility(e.target.value as "public" | "private")}
        >
          <option value="public">Public — appears in game list, counts for leaderboard</option>
          <option value="private">Private — invite only, no leaderboard impact</option>
        </select>
      </div>

      {/* Opponent selection — chess only */}
      {gameKey === "chess" && (
        <div>
          <select
            value={gameMode}
            aria-label="Opponent"
            onChange={(e) => setGameMode(e.target.value as "human" | "ai")}
          >
            <option value="human">vs Human — wait for another player to join</option>
            <option value="ai">vs Computer — play immediately against the AI</option>
          </select>
        </div>
      )}

      {/* NEW: difficulty picker, only shown for AI games */}
      {gameMode === "ai" && (
        <div>
          <select
            value={aiDifficulty}
            aria-label="AI difficulty"
            onChange={(e) => setAiDifficulty(e.target.value as "easy" | "medium" | "hard")}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      )}

      {err && <p className="error-message">{err}</p>}
      <div>
        <button className="primary narrow">Create New Game</button>
      </div>
    </form>
  );
}
