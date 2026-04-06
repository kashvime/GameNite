import { NavLink } from "react-router-dom";
import type { MatchInfo, SafeUserInfo, UserAuth } from "@gamenite/shared";
import useMatchHistory from "../hooks/useMatchHistory.ts";

interface FriendHeadToHeadProps {
  /** The authenticated user */
  auth: UserAuth;
  /** The friend whose record is being displayed. */
  friend: SafeUserInfo;
  onClose: () => void;
}

/**
 * Displays head-to-head match statistics and filtered match history between
 * the authenticated user and one friend.
 */
export function FriendHeadToHead({ auth, friend, onClose }: FriendHeadToHeadProps) {
  const state = useMatchHistory(auth, { opponentUsername: friend.username });

  if (state.type !== "loaded")
    return <p>{state.type === "error" ? state.message : "Loading..."}</p>;

  const wins = state.matches.filter((m) => m.result === "win").length;
  const losses = state.matches.filter((m) => m.result === "loss").length;
  const total = state.matches.length;
  const winRate = `${Math.round((wins / total) * 100)}%`;

  return (
    <div className="spacedSection">
      <button className="secondary narrow" onClick={onClose}>
        ← Back
      </button>
      <h2>vs {friend.display}</h2>
      <NavLink to={`/profile/${friend.username}`} className="smallAndGray">
        @{friend.username}
      </NavLink>

      <div style={{ display: "flex", gap: "1rem" }}>
        {(
          [
            ["Wins", wins],
            ["Losses", losses],
            ["Games", total],
            ["Win Rate", winRate],
          ] as [string, string | number][]
        ).map(([label, value]) => (
          <div
            key={label}
            style={{
              textAlign: "center",
              padding: "0.75rem 1rem",
              border: "1px solid #ddd",
              borderRadius: "0.5rem",
            }}
          >
            <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{value}</div>
            <div className="smallAndGray">{label}</div>
          </div>
        ))}
      </div>

      <table className="matchTable">
        <thead>
          <tr>
            <th>Game</th>
            <th>Result</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {state.matches.map((match: MatchInfo, i) => (
            <tr key={i}>
              <td>{match.gameType}</td>
              <td className={`result-${match.result}`}>{match.result}</td>
              <td>{new Date(match.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
