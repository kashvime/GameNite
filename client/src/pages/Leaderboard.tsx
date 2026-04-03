import { useState } from "react";
import useLeaderboard from "../hooks/useLeaderboard.ts";
import "./Leaderboard.css";
import useAuth from "../hooks/useAuth.ts";

const GAME_TYPES = ["All", "nim", "guess", "chess"];
const TIME_PERIODS = ["Today", "This Week", "This Month", "All Time"] as const;
type TimePeriod = (typeof TIME_PERIODS)[number];

function getDateRange(period: TimePeriod): { from: Date; to: Date } | undefined {
  const now = new Date();
  const from = new Date();
  if (period === "Today") {
    from.setHours(0, 0, 0, 0);
  } else if (period === "This Week") {
    from.setDate(now.getDate() - 7);
  } else if (period === "This Month") {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
  } else {
    return undefined;
  }
  return { from, to: now };
}

export default function Leaderboard() {
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [gameType, setGameType] = useState<string | undefined>(undefined);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("All Time");
  const state = useLeaderboard(gameType, getDateRange(timePeriod), friendsOnly);
  const auth = useAuth();

  return (
    <div className="content">
      <div className="spacedSection">
        <h2>Leaderboard</h2>
        <div className="leaderboard-filters">
          <select
            className="leaderboard-select"
            value={gameType ?? "All"}
            onChange={(e) => setGameType(e.target.value === "All" ? undefined : e.target.value)}
          >
            {GAME_TYPES.map((g) => (
              <option key={g} value={g}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </option>
            ))}
          </select>
          <select
            className="leaderboard-select"
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
          >
            {TIME_PERIODS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
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
              ? state.entries.some((e) => e.user.username === auth.username)
              : false;
            return (
              <>
                {state.entries.length === 0 ? (
                  <div className="smallAndGray">No matches played yet.</div>
                ) : (
                  <table className="leaderboard-table">
                    <thead>
                      <tr>
                        <th className="leaderboard-rank">Rank</th>
                        <th>Player</th>
                        <th className="leaderboard-wins">Wins</th>
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
                          <td className="leaderboard-wins">{entry.wins}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {state.myRank && !isInTop && (
                  <table className="leaderboard-table">
                    <tbody>
                      <tr className="leaderboard-me">
                        <td className="leaderboard-rank">#{state.myRank.rank}</td>
                        <td>
                          <span>You</span>
                          <span className="smallAndGray"> @{auth.username}</span>
                        </td>
                        <td className="leaderboard-wins">{state.myRank.wins}</td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </>
            );
          })()}
      </div>
    </div>
  );
}
