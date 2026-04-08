import ChatPanel from "../components/ChatPanel.tsx";
import useDirectMessages from "../hooks/useDirectMessages.ts";

export default function Messages() {
  const { friendsState, selectedFriend, setSelectedFriend, chatId } = useDirectMessages();

  if (friendsState.type === "waiting") {
    return <div className="smallAndGray">Loading friends...</div>;
  }

  if (friendsState.type === "error") {
    return <div style={{ color: "#f00" }}>{friendsState.msg}</div>;
  }

  return (
    <div className="content spacedSection">
      <h2>Messages</h2>

      <div className="messagesLayout">
        <div className="spacedSection">
          <h3>Your Friends</h3>

          {friendsState.friends.length === 0 ? (
            <p className="smallAndGray">No friends yet. Add someone in the Friends page.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {friendsState.friends.map((friend) => {
                const isSelected = selectedFriend?.username === friend.username;
                return (
                  <li
                    key={friend.username}
                    className={`friendItem ${isSelected ? "friendItemSelected" : ""}`}
                    onClick={() => setSelectedFriend(friend)}
                  >
                    <div className="friendAvatarCircle">
                      {friend.display.charAt(0).toUpperCase()}
                    </div>
                    <div className="friendText">
                      <div className="friendName">{friend.display}</div>
                      <div className="friendHandle">@{friend.username}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="spacedSection" style={{ minWidth: 0 }}>
          {selectedFriend && chatId ? (
            <>
              <h3 style={{ marginBlock: 0 }}>
                {selectedFriend.display}{" "}
                <span className="smallAndGray" style={{ fontWeight: 500 }}>
                  @{selectedFriend.username}
                </span>
              </h3>
              <ChatPanel chatId={chatId} />
            </>
          ) : (
            <div className="smallAndGray">Select a friend to message.</div>
          )}
        </div>
      </div>
    </div>
  );
}
