import useNewGameForm from "../hooks/useNewGameForm.ts";
import { gameNames } from "../util/consts.ts";
import "./NewGame.css";

export default function NewGame() {
  const { gameKey, visibility, setVisibility, handleInputChange, err, handleSubmit } =
    useNewGameForm();
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
