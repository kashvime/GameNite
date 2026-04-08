import useNewGameForm from "../hooks/useNewGameForm.ts";
import { gameNames } from "../util/consts.ts";
import "./NewGame.css";

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
    <div className="new-game-page">
      <form className="new-game-card" onSubmit={handleSubmit}>
        <div className="new-game-card-header">
          <h2>Create new game</h2>
        </div>
        <div className="new-game-card-body">
          <div className="new-game-field">
            <label htmlFor="game-select">Game type</label>
            <select
              id="game-select"
              value={gameKey}
              aria-label="Game selection"
              onChange={(e) => handleInputChange(e)}
            >
              <option value="">— Select a game —</option>
              {Object.entries(gameNames).map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="new-game-field">
            <label>Visibility</label>
            <div className="visibility-options">
              <label className={`visibility-option ${visibility === "public" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={visibility === "public"}
                  onChange={() => setVisibility("public")}
                />
                <div className="visibility-option-text">
                  <strong>🌐 Public</strong>
                  <span>Appears in game list, counts for leaderboard</span>
                </div>
              </label>
              <label className={`visibility-option ${visibility === "private" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={visibility === "private"}
                  onChange={() => setVisibility("private")}
                />
                <div className="visibility-option-text">
                  <strong>🔒 Private</strong>
                  <span>Invite only, no leaderboard impact</span>
                </div>
              </label>
            </div>
          </div>

          {/* Opponent selection — chess only */}
          {gameKey === "chess" && (
            <div className="new-game-field">
              <label>Opponent</label>
              <div className="visibility-options">
                <label className={`visibility-option ${gameMode === "human" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="gameMode"
                    value="human"
                    checked={gameMode === "human"}
                    onChange={() => setGameMode("human")}
                  />
                  <div className="visibility-option-text">
                    <strong>👤 Human</strong>
                    <span>Wait for another player to join</span>
                  </div>
                </label>
                <label className={`visibility-option ${gameMode === "ai" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="gameMode"
                    value="ai"
                    checked={gameMode === "ai"}
                    onChange={() => setGameMode("ai")}
                  />
                  <div className="visibility-option-text">
                    <strong>🤖 Computer</strong>
                    <span>Play immediately against the AI</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Difficulty picker — AI games only */}
          {gameKey === "chess" && gameMode === "ai" && (
            <div className="new-game-field">
              <label htmlFor="difficulty-select">Difficulty</label>
              <select
                id="difficulty-select"
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
        </div>

        <div className="new-game-card-footer">
          <button type="submit" className="primary narrow">
            Create New Game
          </button>
        </div>
      </form>
    </div>
  );
}
