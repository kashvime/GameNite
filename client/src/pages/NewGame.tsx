import useNewGameForm from "../hooks/useNewGameForm.ts";
import { gameNames } from "../util/consts.ts";

export default function NewGame() {
  const { gameKey, visibility, setVisibility, handleInputChange, err, handleSubmit } =
    useNewGameForm();

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
      {err && <p className="error-message">{err}</p>}
      <div>
        <button className="primary narrow">Create New Game</button>
      </div>
    </form>
  );
}
