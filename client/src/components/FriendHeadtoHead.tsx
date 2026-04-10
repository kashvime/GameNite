import "../pages/ViewProfile.css";
import { NavLink } from "react-router-dom";
import { useMemo } from "react";
import type { MatchInfo, SafeUserInfo } from "@gamenite/shared";
import useMatchHistory from "../hooks/useMatchHistory.ts";

interface FriendHeadToHeadProps {
  friend: SafeUserInfo;
  onClose: () => void;
}

export default function FriendHeadToHead({ friend, onClose }: FriendHeadToHeadProps) {
  const filter = useMemo(() => ({ opponentUsername: friend.username }), [friend.username]);
  const state = useMatchHistory(filter);

  const initials = friend.display
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="profile-page">
      <button className="secondary narrow" onClick={onClose} style={{ alignSelf: "flex-start" }}>
        ← Back
      </button>

      {/* Hero */}
      <div className="profile-hero">
        {friend.avatarUrl ? (
          <img
            className="profile-avatar"
            src={friend.avatarUrl}
            alt={`${friend.display}'s avatar`}
          />
        ) : (
          <div className="profile-avatar-initials">{initials}</div>
        )}
        <div className="profile-identity">
          <span className="profile-display-name">{friend.display}</span>
          <NavLink to={`/profile/${friend.username}`} className="profile-username">
            @{friend.username}
          </NavLink>
        </div>
      </div>

      {/* Stats */}
      <div className="profile-section">
        <div className="profile-section-header">
          <h3>Your Stats vs This Player</h3>
        </div>
        <div className="profile-section-body">
          {state.type === "loading" && (
            <p className="smallAndGray" style={{ margin: 0 }}>
              Loading...
            </p>
          )}
          {state.type === "error" && (
            <p className="error-message" style={{ margin: 0 }}>
              {state.message}
            </p>
          )}
          {state.type === "empty" && (
            <p className="smallAndGray" style={{ margin: 0 }}>
              No matches against this player yet.
            </p>
          )}
          {state.type === "loaded" &&
            (() => {
              const wins = state.matches.filter((m) => m.result === "win").length;
              const losses = state.matches.filter((m) => m.result === "loss").length;
              const total = state.matches.length;
              const winRate = Math.round((wins / total) * 100);
              return (
                <>
                  <div className="profile-stats-grid" style={{ marginBottom: "1rem" }}>
                    <div className="profile-stat-chip">
                      <div className="profile-stat-value" style={{ color: "#22c55e" }}>
                        {wins}
                      </div>
                      <div className="profile-stat-label">Wins</div>
                    </div>
                    <div className="profile-stat-chip">
                      <div className="profile-stat-value" style={{ color: "#ef4444" }}>
                        {losses}
                      </div>
                      <div className="profile-stat-label">Losses</div>
                    </div>
                    <div className="profile-stat-chip">
                      <div className="profile-stat-value">{total}</div>
                      <div className="profile-stat-label">Games</div>
                    </div>
                    <div className="profile-stat-chip">
                      <div className="profile-stat-value">{winRate}%</div>
                      <div className="profile-stat-label">Win Rate</div>
                    </div>
                  </div>
                  {state.matches.slice(0, 5).map((match: MatchInfo, i: number) => {
                    const resultColor =
                      match.result === "win"
                        ? "#22c55e"
                        : match.result === "loss"
                          ? "#ef4444"
                          : "#9ca3af";
                    return (
                      <div key={i} className="profile-match-row">
                        <span className="profile-match-game">{match.gameType}</span>
                        <span className="profile-match-result" style={{ color: resultColor }}>
                          {match.result}
                        </span>
                        <span className="profile-match-date">
                          {new Date(match.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    );
                  })}
                </>
              );
            })()}
        </div>
      </div>
    </div>
  );
}
