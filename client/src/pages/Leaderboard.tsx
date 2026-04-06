import { useState } from "react";
import useLeaderboard from "../hooks/useLeaderboard.ts";
import "./Leaderboard.css";
import useAuth from "../hooks/useAuth.ts";
import { computeLeague } from "@gamenite/shared";
import type { GameKey } from "@gamenite/shared";

const GAME_TABS: GameKey[] = ["chess", "nim", "guess"];

export default function Leaderboard() {
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [gameType, setGameType] = useState<GameKey>("chess");
  const state = useLeaderboard(gameType, friendsOnly);
  const auth = useAuth();

  return (
    <div className="content">
      <div className="spacedSection">
        <h2>Leaderboard</h2>

        <div className="leaderboard-tabs">
          {GAME_TABS.map((tab) => (
            <button
              key={tab}
              className={`leaderboard-tab${gameType === tab ? ' active' : ''}`}
              onClick={() => setGameType(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="leaderboard-filters">
          <button
            className={`narrow ${friendsOnly ? "primary" : "secondary"}`}
            onClick={() => setFriendsOnly((v) => !v)}
          >
            {friendsOnly ? "Friends Only" : "All Players"}
          </button>
        </div>

        {state.type === "waiting" && <div>Loading...</div>}
        {state.type === "error" && <div className="error-message">{state.msg}</div>}
        {state.type === "loaded" &&
          (() => {
            const isInTop = state.myRank
              ? state.entries.some((entry) => entry.user.username === auth.username)
              : false;
            return (
              <>
                {state.entries.length === 0 ? (
                  <div className="smallAndGray">No rated players yet.</div>
                ) : (
                  <div className="card" style={{ padding: 0, overflow: 'hidden', maxWidth: '600px' }}>
                  <table className="leaderboard-table">
                    <thead>
                      <tr>
                        <th className="leaderboard-rank">Rank</th>
                        <th>Player</th>
                        <th className="leaderboard-rating">Rating</th>
                        <th>League</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.entries.map((entry, i) => (
                        <tr key={entry.user.username} className={i === 0 ? "leaderboard-top" : ""}>
                          <td className="leaderboard-rank">#{i + 1}</td>
                          <td>
                            <span>{entry.user.display}</span>
                            <span className="smallAndGray"> @{entry.user.username}</span>
                          </td>
                          <td className="leaderboard-rating">{entry.rating}</td>
                          <td>
                            <span className={`league-badge league-${computeLeague(entry.rating)}`}>
                              {computeLeague(entry.rating)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
                {state.myRank && !isInTop && (
                  <div className="card" style={{ padding: 0, overflow: 'hidden', maxWidth: '600px' }}>
                  <table className="leaderboard-table">
                    <tbody>
                      <tr className="leaderboard-me">
                        <td className="leaderboard-rank">#{state.myRank.rank}</td>
                        <td>
                          <span>You</span>
                          <span className="smallAndGray"> @{auth.username}</span>
                        </td>
                        <td className="leaderboard-rating">{state.myRank.rating}</td>
                        <td>
                          <span
                            className={`league-badge league-${computeLeague(state.myRank.rating)}`}
                          >
                            {computeLeague(state.myRank.rating)}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  </div>
                )}
              </>
            );
          })()}
      </div>
    </div>
  );
}
