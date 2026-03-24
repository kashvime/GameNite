import { useState } from "react";
import useAuth from "../hooks/useAuth.ts";
import useFriends from "../hooks/useFriends.ts";

export default function Friends() {
  const auth = useAuth();
  const { state, send, respond } = useFriends(auth);
  const [toUsername, setToUsername] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);

  const handleSend = async () => {
    setSendError(null);
    const err = await send(toUsername);
    if (err) setSendError(err);
    else setToUsername("");
  };

  if (state.type === "waiting") return <div>Loading...</div>;
  if (state.type === "error") return <div style={{ color: "#f00" }}>{state.msg}</div>;

  return (
    <>
      <h2>Friends</h2>

      <section>
        <h3>Add a Friend</h3>
        <input
          type="text"
          placeholder="Username"
          value={toUsername}
          onChange={(e) => setToUsername(e.target.value)}
        />
        <button onClick={handleSend}>Send Request</button>
        {sendError && <div style={{ color: "#f00" }}>{sendError}</div>}
      </section>

      {state.pending.length > 0 && (
        <section>
          <h3>Pending Requests</h3>
          <ul>
            {state.pending.map(({ requestId, from }) => (
              <li key={requestId}>
                {from.display} (@{from.username})
                <button onClick={() => respond(requestId, true)}>Accept</button>
                <button onClick={() => respond(requestId, false)}>Reject</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3>Your Friends</h3>
        {state.friends.length === 0 ? (
          <p>No friends yet.</p>
        ) : (
          <ul>
            {state.friends.map((friend) => (
              <li key={friend.username}>
                {friend.display} (@{friend.username})
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
