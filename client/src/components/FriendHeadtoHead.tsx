import "./FriendHeadtoHead.css";
import { NavLink } from "react-router-dom";
import { useMemo } from "react";
import type { MatchInfo, SafeUserInfo } from "@gamenite/shared";
import useMatchHistory from "../hooks/useMatchHistory.ts";

interface FriendHeadToHeadProps {
  /** The friend whose record is being displayed. */
  friend: SafeUserInfo;
  onClose: () => void;
}

/**
 * Displays head-to-head match statistics and filtered match history between
 * the authenticated user and one friend.
 */
export default function FriendHeadToHead({ friend, onClose }: FriendHeadToHeadProps) {
  const filter = useMemo(() => ({ opponentUsername: friend.username }), [friend.username]);
  const state = useMatchHistory(filter);

  if (state.type === "loading") return <p>Loading...</p>;
  if (state.type === "error") return <p>{state.message}</p>;
  if (state.type === "empty")
    return <p>You haven't played any games against {friend.display} yet.</p>;

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

      <div className="statTiles">
        {(
          [
            ["Wins", wins],
            ["Losses", losses],
            ["Games", total],
            ["Win Rate", winRate],
          ] as [string, string | number][]
        ).map(([label, value]) => (
          <div key={label} className="statTile">
            <div className="statValue">{value}</div>
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
