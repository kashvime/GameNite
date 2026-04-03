import type { SafeUserInfo, MatchInfo } from "@gamenite/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserById } from "../services/userService";
import {
  getFriendshipStatus,
  sendFriendRequest,
  respondToFriendRequest,
} from "../services/friendService";
import type { FriendshipStatus } from "../services/friendService";
import { getMatchHistory } from "../services/matchService";
import { createGame } from "../services/gameService";
import useLoginContext from "../hooks/useLoginContext";

interface ViewProfileProps {
  username: string;
}

export default function ViewProfile({ username }: ViewProfileProps) {
  const { user: loggedInUser, pass } = useLoginContext();
  const auth = { username: loggedInUser.username, password: pass };
  const navigate = useNavigate();

  const [componentState, setComponentState] = useState<
    { type: "waiting" } | { type: "error"; msg: string } | { type: "profile"; user: SafeUserInfo }
  >({ type: "waiting" });
  const [friendStatus, setFriendStatus] = useState<FriendshipStatus | null>(null);
  const [friendError, setFriendError] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchInfo[] | null>(null);
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
    getFriendshipStatus(auth, username).then((res) => {
      if (cancel) return;
      if (!res || "error" in res) return;
      setFriendStatus(res);
    });
    return () => {
      cancel = true;
    };
  }, [username, auth.username]);

  useEffect(() => {
    let cancel = false;
    getMatchHistory(auth).then((res) => {
      if (cancel) return;
      if (!res || "error" in res) return;
      setMatches(res);
    });
    return () => {
      cancel = true;
    };
  }, [username, auth.username]);

  const handleAddFriend = async () => {
    setFriendError(null);
    const res = await sendFriendRequest(auth, username);
    if (res && "error" in res) {
      setFriendError(res.error);
    } else {
      setFriendStatus({ status: "pending_sent" });
    }
  };

  const handleRespond = async (requestId: string, accept: boolean) => {
    setFriendError(null);
    const res = await respondToFriendRequest(auth, requestId, accept);
    if (res && "error" in res) {
      setFriendError(res.error);
    } else {
      setFriendStatus(accept ? { status: "friends" } : { status: "not_connected" });
    }
  };

  const handleChallenge = async () => {
    setChallengeError(null);
    const game = await createGame(auth, "chess");
    if ("error" in game) {
      setChallengeError(game.error);
      return;
    }
    navigate(`/game/${game.gameId}`);
  };

  const renderFriendStatus = () => {
    if (!friendStatus) return null;
    switch (friendStatus.status) {
      case "friends":
        return <span style={{ color: "#22c55e", fontWeight: 500 }}>✓ Friends</span>;
      case "pending_sent":
        return <span style={{ color: "#f59e0b", fontWeight: 500 }}>Pending — request sent</span>;
      case "pending_received":
        return (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ color: "#f59e0b", fontWeight: 500 }}>Friend request received</span>
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
              Reject
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
      return <div style={{ color: "#f00" }}>{componentState.msg}</div>;
    case "waiting":
      return <div className="smallAndGray">Loading profile...</div>;
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

      return (
        <div className="content spacedSection">
          <h2>Profile</h2>

          {/* Avatar + online status */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              width: "fit-content",
            }}
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={`${user.display}'s avatar`}
                style={{ width: "120px", height: "120px", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "120px",
                  height: "120px",
                  background: "#d1d5db",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.875rem",
                  color: "#6b7280",
                }}
              >
                No Photo
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: statusColor,
                  display: "inline-block",
                }}
              />
              <span>{statusLabel}</span>
            </div>
          </div>

          <hr />

          {/* Friend status + Challenge */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {renderFriendStatus()}
            {friendError && <span style={{ color: "#f00" }}>{friendError}</span>}
            <button className="secondary narrow" onClick={handleChallenge}>
              Challenge to Chess
            </button>
            {challengeError && <span style={{ color: "#f00" }}>{challengeError}</span>}
          </div>

          <hr />

          {/* General information */}
          <div>
            <h3>General Information</h3>
            <ul>
              <li>Name: {user.display}</li>
              <li>Join Date: {new Date(user.createdAt).toLocaleDateString()}</li>
              {user.bio ? <li>Bio: {user.bio}</li> : <li className="smallAndGray">No bio yet.</li>}
            </ul>
          </div>

          <hr />

          {/* Stats */}
          <div>
            <h3>Chess Statistic</h3>
            {user.totalGamesPlayed === 0 ? (
              <p className="smallAndGray">No games played yet.</p>
            ) : (
              <ul>
                <li>Total Games Played: {user.totalGamesPlayed}</li>
                <li>Win Rate: {user.winRate}%</li>
                {user.favoriteGame && <li>Favorite Game: {user.favoriteGame}</li>}
              </ul>
            )}
          </div>

          <hr />

          {/* Recent matches */}
          <div>
            <h3>Recent Matches</h3>
            {matches === null ? (
              <p className="smallAndGray">Loading matches...</p>
            ) : matches.length === 0 ? (
              <p className="smallAndGray">No matches played yet.</p>
            ) : (
              <ul>
                {matches.slice(0, 5).map((match, i) => (
                  <li key={i}>
                    {match.gameType} — {match.result}
                    {match.opponent && ` vs ${match.opponent.display}`}
                    {match.score !== undefined && ` — Score: ${match.score}`}
                    {" — "}
                    {new Date(match.createdAt).toLocaleDateString()}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      );
    }
  }
}
