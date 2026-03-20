import type { SafeUserInfo } from "@gamenite/shared";
import { useEffect, useState } from "react";
import useTimeSince from "../hooks/useTimeSince";
import { getUserById } from "../services/userService";

interface ViewProfileProps {
  username: string;
}
export default function ViewProfile({ username }: ViewProfileProps) {
  const [componentState, setComponentState] = useState<
    { type: "waiting" } | { type: "error"; msg: string } | { type: "profile"; user: SafeUserInfo }
  >({ type: "waiting" });
  const timeSince = useTimeSince();

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

  switch (componentState.type) {
    case "error":
      return <div style={{ color: "#f00" }}>{componentState.msg}</div>;
    case "waiting":
      return <div>Loading...</div>;
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
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "fit-content" }}>
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
              Profile Picture
            </div>
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

          {/* General information */}
          <div>
            <h3>General Information</h3>
            <ul>
              <li>Name: {user.display}</li>
              <li>Join Date: {new Date(user.createdAt).toLocaleDateString()}</li>
            </ul>
          </div>

          <hr />

          {/* Stats */}
          <div>
            <h3>Chess Statistic</h3>
            <ul>
              <li>Total Games Played: {user.totalGamesPlayed}</li>
              <li>Win Rate: {user.winRate}%</li>
              {user.favoriteGame && <li>Favorite Game: {user.favoriteGame}</li>}
            </ul>
          </div>
        </div>
      );
    }
  }
}