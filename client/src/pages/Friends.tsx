import "./ViewProfile.css";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import useAuth from "../hooks/useAuth.ts";
import useFriends from "../hooks/useFriends.ts";

export default function Friends() {
  const auth = useAuth();
  const { state, send, respond } = useFriends(auth);
  const [toUsername, setToUsername] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  async function handleSend() {
    setSendError(null);
    const err = await send(toUsername);
    if (err) setSendError(err);
    else setToUsername("");
  }

  if (state.type === "waiting")
    return <div className="content smallAndGray">Loading friends...</div>;
  if (state.type === "error") return <div className="content error-message">{state.msg}</div>;

  return (
    <div className="profile-page">
      {/* Add a Friend */}
      <div className="profile-section">
        <div className="profile-section-header">
          <h3>Add a Friend</h3>
        </div>
        <div
          className="profile-section-body"
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              className="widefill notTooWide"
              type="text"
              placeholder="Username"
              value={toUsername}
              onChange={(e) => setToUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button className="primary narrow" onClick={handleSend}>
              Send Request
            </button>
          </div>
          {sendError && (
            <p className="error-message" style={{ margin: 0 }}>
              {sendError}
            </p>
          )}
        </div>
      </div>

      {/* Pending Requests */}
      {state.pending.length > 0 && (
        <div className="profile-section">
          <div className="profile-section-header">
            <h3>Pending Requests</h3>
          </div>
          <div className="profile-section-body" style={{ padding: 0 }}>
            {state.pending.map(({ requestId, from }) => (
              <div key={requestId} className="friend-row">
                <div className="friend-row-identity">
                  <span className="friend-row-name">{from.display}</span>
                  <span className="friend-row-username">@{from.username}</span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="primary narrow" onClick={() => respond(requestId, true)}>
                    Accept
                  </button>
                  <button className="secondary narrow" onClick={() => respond(requestId, false)}>
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div className="profile-section">
        <div className="profile-section-header">
          <h3>Your Friends</h3>
        </div>
        <div className="profile-section-body" style={{ padding: 0 }}>
          {state.friends.length === 0 ? (
            <p className="smallAndGray" style={{ margin: 0, padding: "1rem 1.25rem" }}>
              No friends yet. Add someone above!
            </p>
          ) : (
            state.friends.map((friend) => (
              <NavLink
                key={friend.username}
                to={`/profile/${friend.username}`}
                className="friend-row friend-row-clickable"
                style={{ textDecoration: "none" }}
              >
                <div className="friend-row-identity">
                  <span className="friend-row-name">{friend.display}</span>
                  <span className="friend-row-username">@{friend.username}</span>
                </div>
              </NavLink>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
