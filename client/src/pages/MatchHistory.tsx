import useAuth from "../hooks/useAuth.ts";
import useMatchHistory from "../hooks/useMatchHistory.ts";

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
          <div className="dottedList" role="list">
            {matches.map((match, i) => (
              <div key={i} role="listitem">
                <span>{match.gameType}</span>
                <span>{match.result}</span>
                <span>{match.createdAt}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
