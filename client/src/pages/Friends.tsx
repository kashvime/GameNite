import { useState } from "react";
import type { SafeUserInfo } from "@gamenite/shared";
import useAuth from "../hooks/useAuth.ts";
import useFriends from "../hooks/useFriends.ts";
import FriendHeadToHead from "../components/FriendHeadtoHead.tsx";

export default function Friends() {
  const auth = useAuth();
  const { state, send, respond } = useFriends(auth);
  const [toUsername, setToUsername] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<SafeUserInfo | null>(null);

  async function handleSend() {
    setSendError(null);
    const err = await send(toUsername);
    if (err) setSendError(err);
    else setToUsername("");
  }

  if (state.type === "waiting") return <div className="smallAndGray">Loading friends...</div>;
  if (state.type === "error") return <div style={{ color: "#f00" }}>{state.msg}</div>;

  if (selectedFriend) {
    return (
      <div className="content">
        <FriendHeadToHead friend={selectedFriend} onClose={() => setSelectedFriend(null)} />
      </div>
    );
  }

  return (
    <div className="content spacedSection">
      <h2>Friends</h2>

      {/* Add a Friend */}
      <div className="spacedSection">
        <h3>Add a Friend</h3>
        <div style={{ display: "flex", flexDirection: "row", gap: "0.5rem" }}>
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
        {sendError && <p style={{ color: "#f00" }}>{sendError}</p>}
      </div>

      <hr />

      {/* Pending Requests */}
      {state.pending.length > 0 && (
        <>
          <div className="spacedSection">
            <h3>Pending Requests</h3>
            <ul>
              {state.pending.map(({ requestId, from }) => (
                <li
                  key={requestId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span>
                    {from.display} (@{from.username})
                  </span>
                  <button className="primary narrow" onClick={() => respond(requestId, true)}>
                    Accept
                  </button>
                  <button className="secondary narrow" onClick={() => respond(requestId, false)}>
                    Reject
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <hr />
        </>
      )}

      {/* Friends List */}
      <div className="spacedSection">
        <h3>Your Friends</h3>
        {state.friends.length === 0 ? (
          <p className="smallAndGray">No friends yet. Add someone above!</p>
        ) : (
          <ul>
            {state.friends.map((friend) => (
              <li
                key={friend.username}
                style={{ marginBottom: "0.4rem", cursor: "pointer" }}
                onClick={() => setSelectedFriend(friend)}
              >
                {friend.display} (@{friend.username})
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
