import { useState } from "react";
import useLeaderboard from "../hooks/useLeaderboard.ts";
import "./Leaderboard.css";
import useAuth from "../hooks/useAuth.ts";
import { computeLeague, type GameKey, type League } from "@gamenite/shared";

const GAME_TABS: GameKey[] = ["chess", "nim", "guess"];
const LEAGUES: League[] = ["bronze", "silver", "gold"];
const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function Leaderboard() {
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [gameType, setGameType] = useState<GameKey>("chess");
  const [league, setLeague] = useState<League | undefined>(undefined);
  const state = useLeaderboard(gameType, friendsOnly, league);
  const auth = useAuth();

  const leaderboardTitle = league
    ? `${league.charAt(0).toUpperCase() + league.slice(1)} League — ${gameType.charAt(0).toUpperCase() + gameType.slice(1)}`
    : `${gameType.charAt(0).toUpperCase() + gameType.slice(1)} Leaderboard`;

  const myRank = state.type === "loaded" ? state.myRank : null;

  return (
    <div className="leaderboard-page">
      {/* ── Game tabs ── */}
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

      {/* ── Filters ── */}
      <div className="leaderboard-filters">
        <button
          className={`leaderboard-toggle${friendsOnly ? " active" : ""}`}
          onClick={() => setFriendsOnly((v) => !v)}
        >
          {friendsOnly ? "Friends Only" : "All Players"}
        </button>
        <div className="leaderboard-league-filters">
          <button
            className={`leaderboard-league-btn${league === undefined ? " active" : ""}`}
            onClick={() => setLeague(undefined)}
          >
            All
          </button>
          {LEAGUES.map((l) => (
            <button
              key={l}
              className={`leaderboard-league-btn league-btn-${l}${league === l ? " active" : ""}`}
              onClick={() => setLeague(league === l ? undefined : l)}
            >
              {l.charAt(0).toUpperCase() + l.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="leaderboard-header-row">
        <p className="leaderboard-subtitle">{leaderboardTitle}</p>
        {state.type === "loaded" && (
          <span className="leaderboard-my-rank">
            {myRank && (!league || computeLeague(myRank.rating) === league) ? (
              <>
                You are currently ranked <strong>#{myRank.rank}</strong>
              </>
            ) : league ? (
              "You are not in this league"
            ) : null}
          </span>
        )}
      </div>

      {state.type === "waiting" && <div className="smallAndGray">Loading...</div>}
      {state.type === "error" && <div className="error-message">{state.msg}</div>}
      {state.type === "loaded" &&
        (() => {
          const isInTop = state.myRank
            ? state.entries.some((e) => e.user.username === auth.username)
            : false;
          return (
            <>
              {state.entries.length === 0 ? (
                <div className="leaderboard-empty">
                  <p className="leaderboard-empty-title">No players in this league.</p>
                  {league && (
                    <button className="leaderboard-back-btn" onClick={() => setLeague(undefined)}>
                      ← Go back to all leagues
                    </button>
                  )}
                </div>
              ) : (
                <div className="leaderboard-card">
                  <table className="leaderboard-table">
                    <thead>
                      <tr>
                        <th className="col-rank">Rank</th>
                        <th>Player</th>
                        <th className="col-rating">Rating</th>
                        <th>League</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.entries.map((entry, i) => {
                        const isMe = entry.user.username === auth.username;
                        const rank = i + 1;
                        return (
                          <tr
                            key={entry.user.username}
                            className={isMe ? "row-you" : rank === 1 ? "row-top" : ""}
                          >
                            <td className="col-rank">
                              {rank <= 3 ? (
                                <span className="lb-medal">{MEDALS[rank]}</span>
                              ) : (
                                <span className="lb-rank-num">#{rank}</span>
                              )}
                            </td>
                            <td>
                              <span className="lb-display">
                                {isMe ? "You" : entry.user.display}
                              </span>
                              <span className="lb-username"> @{entry.user.username}</span>
                            </td>
                            <td className="col-rating">{entry.rating}</td>
                            <td>
                              <span
                                className={`league-badge league-${computeLeague(entry.rating)}`}
                              >
                                {computeLeague(entry.rating)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {state.myRank &&
                !isInTop &&
                (!league || computeLeague(state.myRank.rating) === league) && (
                  <div className="leaderboard-card leaderboard-you-card">
                    <table className="leaderboard-table">
                      <tbody>
                        <tr className="row-you">
                          <td className="col-rank">
                            <span className="lb-rank-num">#{state.myRank.rank}</span>
                          </td>
                          <td>
                            <span className="lb-display">You</span>
                            <span className="lb-username"> @{auth.username}</span>
                          </td>
                          <td className="col-rating">{state.myRank.rating}</td>
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
  );
}
