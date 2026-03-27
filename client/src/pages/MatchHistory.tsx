import useAuth from "../hooks/useAuth.ts";
import useMatchHistory from "../hooks/useMatchHistory.ts";
import { NavLink } from "react-router-dom";

export default function MatchHistory() {
  const auth = useAuth();
  const matches = useMatchHistory(auth);

  return (
    <div className="content">
      <div className="spacedSection">
        <h2>Match History</h2>
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
