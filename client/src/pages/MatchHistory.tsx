import useAuth from "../hooks/useAuth.ts";
import useMatchHistory from "../hooks/useMatchHistory.ts";
import useFriends from "../hooks/useFriends.ts";
import { useState } from "react";
import type { MatchFilter, MatchInfo } from "@gamenite/shared";
import { NavLink } from "react-router-dom";
import MatchFilterBar from "../components/MatchFilterBar.tsx";
import "./MatchHistory.css";
import ChessMoveList from "../components/ChessMoveList.tsx";

/**
 * Displays the authenticated user's match history in a table, with
 * filtering by game type, result, opponent, and date range.
 */
export default function MatchHistory() {
  const auth = useAuth();
  const [filter, setFilter] = useState<MatchFilter>({} as MatchFilter);
  const matchState = useMatchHistory(filter);
  const matches: MatchInfo[] = matchState.type === "loaded" ? matchState.matches : [];
  const { state: friendsState } = useFriends(auth);
  const friends = friendsState.type === "loaded" ? friendsState.friends : [];

  return (
    <div className="mh-page">
      <div className="mh-card">
        {/* Header */}
        <div className="mh-header">
          <h3>Match History</h3>
        </div>

        {/* Filters */}
        <div className="mh-filters">
          <MatchFilterBar filter={filter} setFilter={setFilter} friends={friends} />
        </div>

        {/* States */}
        {matchState.type === "loading" && <p className="smallAndGray mh-state">Loading...</p>}
        {matchState.type === "error" && (
          <p className="error-message mh-state">{matchState.message}</p>
        )}
        {matchState.type === "empty" && <p className="smallAndGray mh-state">No matches found.</p>}

        {/* Table */}
        {matchState.type === "loaded" && (
          <table className="matchTable">
            <thead>
              <tr>
                <th>Game</th>
                <th>Opponent</th>
                <th>Result</th>
                <th>Rating</th>
                <th>Date</th>
                <th>Moves</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match: MatchInfo) => (
                <tr
                  key={`${match.gameType}-${new Date(match.createdAt).toISOString()}`}
                  className={`row-${match.result}`}
                >
                  <td>
                    <span className="mh-game-badge">{match.gameType}</span>
                  </td>
                  <td>
                    {match.opponent ? (
                      <NavLink to={`/profile/${match.opponent.username}`}>
                        {match.opponent.display}
                      </NavLink>
                    ) : (
                      <span className="smallAndGray">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`result-${match.result}`}>{match.result}</span>
                  </td>
                  <td>
                    {match.ratingDelta !== undefined ? (
                      <span
                        className={`mh-delta ${match.ratingDelta >= 0 ? "mh-delta-pos" : "mh-delta-neg"}`}
                      >
                        {match.ratingDelta >= 0 ? "+" : ""}
                        {match.ratingDelta}
                      </span>
                    ) : (
                      <span className="smallAndGray">—</span>
                    )}
                  </td>
                  <td style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                    {new Date(match.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    {match.gameType === "chess" && match.pgn && <ChessMoveList pgn={match.pgn} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
