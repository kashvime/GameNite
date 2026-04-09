import "./ViewProfile.css";
import type { SafeUserInfo, MatchInfo } from "@gamenite/shared";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserById } from "../services/userService";
import {
  getFriendshipStatus,
  sendFriendRequest,
  respondToFriendRequest,
} from "../services/friendService";
import type { FriendshipStatus } from "../services/friendService";
import { createGame } from "../services/gameService";
import useLoginContext from "../hooks/useLoginContext";
import { computeLeague } from "@gamenite/shared";
import useMatchHistory from "../hooks/useMatchHistory";

interface ViewProfileProps {
  username: string;
}

export default function ViewProfile({ username }: ViewProfileProps) {
  const { user: loggedInUser, pass } = useLoginContext();
  const navigate = useNavigate();

  const [componentState, setComponentState] = useState<
    { type: "waiting" } | { type: "error"; msg: string } | { type: "profile"; user: SafeUserInfo }
  >({ type: "waiting" });
  const [friendStatus, setFriendStatus] = useState<FriendshipStatus | null>(null);
  const [friendError, setFriendError] = useState<string | null>(null);
  const [challengeError, setChallengeError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    getUserById(username)
      .then((response) => {
        if (cancel) return;
        if ("error" in response) {
          setComponentState({ type: "error", msg: response.error });
        } else {
          setComponentState({ type: "profile", user: response });
        }
      })
      .catch((err) => {
        if (cancel) return;
        setComponentState({ type: "error", msg: `${err}` });
      });
    return () => {
      cancel = true;
    };
  }, [username]);

  useEffect(() => {
    let cancel = false;
    const auth = { username: loggedInUser.username, password: pass };
    getFriendshipStatus(auth, username).then((res) => {
      if (cancel) return;
      if (!res || "error" in res) return;
      setFriendStatus(res);
    });
    return () => {
      cancel = true;
    };
  }, [username, loggedInUser.username, pass]);

  const isOwnProfile = loggedInUser.username === username;
  const h2hFilter = useMemo(() => ({ opponentUsername: username }), [username]);
  const h2hState = useMatchHistory(isOwnProfile ? undefined : h2hFilter);

  const handleAddFriend = async () => {
    setFriendError(null);
    const auth = { username: loggedInUser.username, password: pass };
    const res = await sendFriendRequest(auth, username);
    if (res && "error" in res) setFriendError(res.error);
    else setFriendStatus({ status: "pending_sent" });
  };

  const handleRespond = async (requestId: string, accept: boolean) => {
    setFriendError(null);
    const auth = { username: loggedInUser.username, password: pass };
    const res = await respondToFriendRequest(auth, requestId, accept);
    if (res && "error" in res) setFriendError(res.error);
    else setFriendStatus(accept ? { status: "friends" } : { status: "not_connected" });
  };

  const handleChallenge = async () => {
    setChallengeError(null);
    const auth = { username: loggedInUser.username, password: pass };
    const game = await createGame(auth, "chess");
    if ("error" in game) {
      setChallengeError(game.error);
      return;
    }
    navigate(`/game/${game.gameId}`);
  };

  const renderFriendAction = () => {
    if (!friendStatus) return null;
    switch (friendStatus.status) {
      case "friends":
        return (
          <span style={{ color: "#22c55e", fontWeight: 600, fontSize: "0.9rem" }}>✓ Friends</span>
        );
      case "pending_sent":
        return (
          <span style={{ color: "#f59e0b", fontWeight: 500, fontSize: "0.9rem" }}>
            Request sent
          </span>
        );
      case "pending_received":
        return (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ color: "#f59e0b", fontWeight: 500, fontSize: "0.9rem" }}>
              Friend request
            </span>
            <button
              className="primary narrow"
              onClick={() => handleRespond(friendStatus.requestId, true)}
            >
              Accept
            </button>
            <button
              className="secondary narrow"
              onClick={() => handleRespond(friendStatus.requestId, false)}
            >
              Decline
            </button>
          </div>
        );
      case "not_connected":
        return (
          <button className="primary narrow" onClick={handleAddFriend}>
            Add Friend
          </button>
        );
    }
  };

  switch (componentState.type) {
    case "error":
      return <div className="content error-message">{componentState.msg}</div>;
    case "waiting":
      return <div className="content smallAndGray">Loading profile...</div>;
    case "profile": {
      const { user } = componentState;

      const statusColor =
        user.onlineStatus === "online"
          ? "#22c55e"
          : user.onlineStatus === "in_match"
            ? "#f59e0b"
            : "#9ca3af";
      const statusLabel =
        user.onlineStatus === "online"
          ? "Online"
          : user.onlineStatus === "in_match"
            ? "In Match"
            : "Offline";
      const initials = user.display
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      return (
        <div className="profile-page">
          {/* ── Hero ── */}
          <div className="profile-hero">
            {user.avatarUrl ? (
              <img
                className="profile-avatar"
                src={user.avatarUrl}
                alt={`${user.display}'s avatar`}
              />
            ) : (
              <div className="profile-avatar-initials">{initials}</div>
            )}
            <div className="profile-identity">
              <span className="profile-display-name">{user.display}</span>
              <span className="profile-username">@{user.username}</span>
              <div className="profile-status">
                <span className="profile-status-dot" style={{ background: statusColor }} />
                <span className="profile-status-label">{statusLabel}</span>
              </div>
              <div className="profile-meta">
                <span className="profile-meta-item">
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
              {user.bio && <p className="profile-bio">{user.bio}</p>}
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="profile-actions">
            {renderFriendAction()}
            {friendError && <span className="error-message">{friendError}</span>}
            <button className="secondary narrow" onClick={handleChallenge}>
              Challenge to Chess
            </button>
            {challengeError && <span className="error-message">{challengeError}</span>}
          </div>

          {/* ── Statistics ── */}
          <div className="profile-section">
            <div className="profile-section-header">
              <h3>Statistics</h3>
            </div>
            <div className="profile-section-body">
              {user.totalGamesPlayed === 0 ? (
                <p className="smallAndGray" style={{ margin: 0 }}>
                  No games played yet.
                </p>
              ) : (
                <div className="profile-stats-grid">
                  <div className="profile-stat-chip">
                    <div className="profile-stat-value">{user.totalGamesPlayed}</div>
                    <div className="profile-stat-label">Games Played</div>
                  </div>
                  <div className="profile-stat-chip">
                    <div className="profile-stat-value">{user.winRate}%</div>
                    <div className="profile-stat-label">Win Rate</div>
                  </div>
                  {user.favoriteGame && (
                    <div className="profile-stat-chip">
                      <div
                        className="profile-stat-value"
                        style={{ fontSize: "1.35rem", textTransform: "capitalize" }}
                      >
                        {user.favoriteGame}
                      </div>
                      <div className="profile-stat-label">Favorite Game</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Ratings ── */}
          <div className="profile-section">
            <div className="profile-section-header">
              <h3>Ratings</h3>
            </div>
            <div className="profile-section-body">
              {(["chess", "nim", "guess"] as const).map((gameType) => {
                const rating = user.ratings?.[gameType] ?? 1000;
                const league = computeLeague(rating);
                const pointsToPromote =
                  league === "bronze" ? 1200 - rating : league === "silver" ? 1800 - rating : null;
                const pointsToDemote =
                  league === "gold" ? rating - 1799 : league === "silver" ? rating - 1199 : null;
                return (
                  <div key={gameType} className="profile-rating-row">
                    <div>
                      <div className="profile-rating-game">{gameType}</div>
                      <div className="profile-rating-sub">
                        {league === "gold"
                          ? "Top league"
                          : pointsToPromote !== null
                            ? `${pointsToPromote} pts to next league`
                            : ""}
                        {pointsToDemote !== null && league !== "gold"
                          ? ` · ${pointsToDemote} pts above demotion`
                          : ""}
                      </div>
                    </div>
                    <div className="profile-rating-right">
                      <span className="profile-rating-number">{rating}</span>
                      <span className={`league-badge league-${league}`}>{league}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Head to Head (only on other people's profiles) ── */}
          {!isOwnProfile && (
            <div className="profile-section">
              <div className="profile-section-header">
                <h3>Your Stats vs This Player</h3>
              </div>
              <div className="profile-section-body">
                {h2hState.type === "loading" && (
                  <p className="smallAndGray" style={{ margin: 0 }}>
                    Loading...
                  </p>
                )}
                {h2hState.type === "error" && (
                  <p className="error-message" style={{ margin: 0 }}>
                    {h2hState.message}
                  </p>
                )}
                {h2hState.type === "empty" && (
                  <p className="smallAndGray" style={{ margin: 0 }}>
                    No matches against this player yet.
                  </p>
                )}
                {h2hState.type === "loaded" &&
                  (() => {
                    const wins = h2hState.matches.filter(
                      (m: MatchInfo) => m.result === "win",
                    ).length;
                    const losses = h2hState.matches.filter(
                      (m: MatchInfo) => m.result === "loss",
                    ).length;
                    const total = h2hState.matches.length;
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
                        {h2hState.matches.slice(0, 5).map((match: MatchInfo, i: number) => {
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
          )}
        </div>
      );
    }
  }
}
