import { useState } from "react";
import useLeaderboard from "../hooks/useLeaderboard.ts";
import "./Leaderboard.css";
import useAuth from "../hooks/useAuth.ts";
import { computeLeague, type GameKey, type League } from "@gamenite/shared";

const GAME_TABS: GameKey[] = ["chess", "nim", "guess"];
const LEAGUES: League[] = ["bronze", "silver", "gold"];

export default function Leaderboard() {
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [gameType, setGameType] = useState<GameKey>("chess");
  const [league, setLeague] = useState<League | undefined>(undefined);
  const state = useLeaderboard(gameType, friendsOnly, league);
  const auth = useAuth();

  const leaderboardTitle = league
    ? `${league.charAt(0).toUpperCase() + league.slice(1)} League — ${gameType.charAt(0).toUpperCase() + gameType.slice(1)}`
    : `${gameType.charAt(0).toUpperCase() + gameType.slice(1)} Leaderboard`;

  return (
    <div className="content">
      <div className="spacedSection">
        <h2>Leaderboard</h2>

        <div className="leaderboard-tabs">
          {GAME_TABS.map((tab) => (
            <button
              key={tab}
              className={`leaderboard-tab${gameType === tab ? " active" : ""}`}
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

          <div className="leaderboard-league-filters">
            <button
              className={`narrow leaderboard-league-btn${league === undefined ? " active" : ""}`}
              onClick={() => setLeague(undefined)}
            >
              All Leagues
            </button>
            {LEAGUES.map((l) => (
              <button
                key={l}
                className={`narrow leaderboard-league-btn league-btn-${l}${league === l ? " active" : ""}`}
                onClick={() => setLeague(league === l ? undefined : l)}
              >
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <p className="leaderboard-subtitle smallAndGray">{leaderboardTitle}</p>

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
                  <div className="smallAndGray">No other rated players in this view.</div>
                ) : (
                  <div
                    className="card"
                    style={{ padding: 0, overflow: "hidden", maxWidth: "600px" }}
                  >
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
                          <tr
                            key={entry.user.username}
                            className={
                              entry.user.username === auth.username
                                ? "leaderboard-you"
                                : i === 0
                                  ? "leaderboard-top"
                                  : ""
                            }
                          >
                            <td className="leaderboard-rank">#{i + 1}</td>
                            <td>
                              <span>
                                {entry.user.username === auth.username ? "You" : entry.user.display}
                              </span>
                              <span className="smallAndGray"> @{entry.user.username}</span>
                            </td>
                            <td className="leaderboard-rating">{entry.rating}</td>
                            <td>
                              <span
                                className={`league-badge league-${computeLeague(entry.rating)}`}
                              >
                                {computeLeague(entry.rating)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {state.myRank &&
                  !isInTop &&
                  (!league || computeLeague(state.myRank.rating) === league) && (
                    <div
                      className="card"
                      style={{ padding: 0, overflow: "hidden", maxWidth: "600px" }}
                    >
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
