import useAuth from "../hooks/useAuth.ts";
import useMatchHistory from "../hooks/useMatchHistory.ts";
import useFriends from "../hooks/useFriends.ts";
import { useState } from "react";
import type { MatchFilter } from "@gamenite/shared";
import { NavLink } from "react-router-dom";
import MatchFilterBar from "../components/MatchFilterBar.tsx";
import "./MatchHistory.css";
/**
 * Displays the authenticated user's match history in a table, with
 * filtering by game type, result, opponent, and date range.
 */

export default function MatchHistory() {
  const auth = useAuth();
  const [filter, setFilter] = useState<MatchFilter>({});
  const matches = useMatchHistory(auth, filter);
  const { state: friendsState } = useFriends(auth);
  const friends = friendsState.type === "loaded" ? friendsState.friends : [];

  return (
    <div className="content">
      <div className="spacedSection">
        <h2>Match History</h2>
        <MatchFilterBar filter={filter} setFilter={setFilter} friends={friends} />
        {"message" in matches ? (
          matches.message
        ) : (
          <table className="matchTable">
            <thead>
              <tr>
                <th>Game</th>
                <th>Opponent</th>
                <th>Result</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match, i) => (
                <tr key={i}>
                  <td>{match.gameType}</td>
                  <td>
                    {match.opponent ? (
                      <NavLink to={`/profile/${match.opponent.username}`}>
                        {match.opponent.display}
                      </NavLink>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={`result-${match.result}`}>{match.result}</td>
                  <td>{new Date(match.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
