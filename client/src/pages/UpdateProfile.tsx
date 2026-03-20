import { useState } from "react";
import useLoginContext from "../hooks/useLoginContext";
import useTimeSince from "../hooks/useTimeSince";
import useEditProfileForm from "../hooks/useEditProfileForm";

export default function UpdateProfile() {
  const { user } = useLoginContext();
  const timeSince = useTimeSince();
  const [showPass, setShowPass] = useState(false);
  const { display, setDisplay, password, setPassword, confirm, setConfirm, err, handleSubmit } =
    useEditProfileForm();

    return (
      <form className="content spacedSection" onSubmit={handleSubmit}>
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
                background: "#22c55e",
                display: "inline-block",
              }}
            />
            <span>Online</span>
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
            <li>Total Games Played: {user.totalGamesPlayed ?? 0}</li>
            <li>Win Rate: {user.winRate ?? 0}%</li>
            {user.favoriteGame && <li>Favorite Game: {user.favoriteGame}</li>}
          </ul>
        </div>
  
        <hr />
  
        {/* Edit display name */}
        <div className="spacedSection">
          <h3>Display name</h3>
          <div style={{ display: "flex", flexDirection: "row", gap: "0.5rem" }}>
            <input
              className="widefill notTooWide"
              value={display}
              onChange={(e) => setDisplay(e.target.value)}
            />
            <button
              className="secondary narrow"
              onClick={(e) => {
                e.preventDefault();
                setDisplay(user.display);
              }}
            >
              Reset
            </button>
          </div>
        </div>
  
        <hr />
  
        {/* Reset password */}
        <div className="spacedSection">
          <h3>Reset password</h3>
          <div style={{ display: "flex", flexDirection: "row", gap: "0.5rem" }}>
            <input
              type={showPass ? "input" : "password"}
              className="widefill notTooWide"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              className="secondary narrow"
              onClick={(e) => {
                e.preventDefault();
                setPassword("");
                setConfirm("");
              }}
            >
              Reset
            </button>
            <button
              className="secondary narrow"
              aria-label="Toggle show password"
              onClick={(e) => {
                e.preventDefault();
                setShowPass((v) => !v);
              }}
            >
              {showPass ? "Hide" : "Reveal"}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "row", gap: "0.5rem" }}>
            <input
              type={showPass ? "input" : "password"}
              className="widefill notTooWide"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>
  
        <hr />
  
        {err && <p className="error-message">{err}</p>}
        <div>
          <button className="primary narrow">Submit</button>
        </div>
        <div className="smallAndGray">After updating your profile, you will be logged out</div>
      </form>
    );
  }