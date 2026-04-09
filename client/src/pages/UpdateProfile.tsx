import "./ViewProfile.css";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import useLoginContext from "../hooks/useLoginContext";
import useEditProfileForm from "../hooks/useEditProfileForm";
import { computeLeague } from "@gamenite/shared";
import useMatchHistory from "../hooks/useMatchHistory";
import type { MatchInfo } from "@gamenite/shared";

/**
 * Page component that allows the logged-in user to update their profile.
 * Displays the user's stats, ratings, and match history, and provides forms to
 * edit display name, bio, password, and profile picture.
 */
export default function UpdateProfile() {
  const { user } = useLoginContext();
  const [showPass, setShowPass] = useState(false);
  const {
    display,
    setDisplay,
    password,
    setPassword,
    confirm,
    setConfirm,
    bio,
    setBio,
    hideFromGlobalLeaderboard,
    setHideFromGlobalLeaderboard,
    err,
    info,
    handleSubmit,
  } = useEditProfileForm();

  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatarUrl ?? null);
  const matchState = useMatchHistory();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const initials = user.display
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <form
      className="profile-page"
      onSubmit={(e) => {
        handleSubmit(e, avatarPreview, bio);
      }}
    >
      {/* ── Hero ── */}
      <div className="profile-hero">
        <label className="profile-avatar-edit">
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleAvatarChange}
          />
          {avatarPreview ? (
            <img className="profile-avatar" src={avatarPreview} alt="Your avatar" />
          ) : (
            <div className="profile-avatar-initials">{initials}</div>
          )}
          <div className="profile-avatar-edit-overlay">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span>Edit</span>
          </div>
        </label>
        <div className="profile-identity">
          <span className="profile-display-name">{user.display}</span>
          <span className="profile-username">@{user.username}</span>
          <div className="profile-status">
            <span className="profile-status-dot" style={{ background: "#22c55e" }} />
            <span className="profile-status-label">Online</span>
          </div>
          <div className="profile-meta">
            <span className="profile-meta-item">
              Joined {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
          {user.bio && <p className="profile-bio">{user.bio}</p>}
        </div>
      </div>

      {/* ── Statistics ── */}
      <div className="profile-section">
        <div className="profile-section-header">
          <h3>Statistics</h3>
        </div>
        <div className="profile-section-body">
          {(user.totalGamesPlayed ?? 0) === 0 ? (
            <p className="smallAndGray" style={{ margin: 0 }}>
              No games played yet.
            </p>
          ) : (
            <div className="profile-stats-grid">
              <div className="profile-stat-chip">
                <div className="profile-stat-value">{user.totalGamesPlayed ?? 0}</div>
                <div className="profile-stat-label">Games Played</div>
              </div>
              <div className="profile-stat-chip">
                <div className="profile-stat-value">{user.winRate ?? 0}%</div>
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

      {/* ── Recent Matches ── */}
      <div className="profile-section">
        <div className="profile-section-header">
          <h3>Recent Matches</h3>
        </div>
        <div className="profile-section-body">
          {matchState.type === "loading" && (
            <p className="smallAndGray" style={{ margin: 0 }}>
              Loading...
            </p>
          )}
          {matchState.type === "empty" && (
            <p className="smallAndGray" style={{ margin: 0 }}>
              No matches played yet.
            </p>
          )}
          {matchState.type === "loaded" &&
            matchState.matches.slice(0, 5).map((match: MatchInfo, i: number) => {
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
                  <span className="profile-match-opponent">
                    {match.opponent ? (
                      <>
                        vs{" "}
                        <NavLink
                          to={`/profile/${match.opponent.username}`}
                          style={{
                            color: "var(--color-primary)",
                            textDecoration: "none",
                            fontWeight: 600,
                          }}
                        >
                          {match.opponent.display}
                        </NavLink>
                      </>
                    ) : (
                      "Solo"
                    )}
                  </span>
                  <span className="profile-match-date">
                    {new Date(match.createdAt).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* ── Edit Profile ── */}
      <div className="profile-section">
        <div className="profile-section-header">
          <h3>Edit Profile</h3>
        </div>
        <div
          className="profile-section-body"
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          {/* Bio */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Bio</label>
            <textarea
              className="widefill notTooWide"
              placeholder="Write a short bio..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              style={{ resize: "vertical" }}
            />
          </div>

          {/* Display name */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Display Name</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
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

          {/* Privacy */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Leaderboard Privacy</label>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.9rem",
              }}
            >
              <input
                type="checkbox"
                checked={hideFromGlobalLeaderboard}
                onChange={(e) => setHideFromGlobalLeaderboard(e.target.checked)}
              />
              Hide me from global leaderboard (still visible on friends-only leaderboard)
            </label>
          </div>

          {/* Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>New Password</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type={showPass ? "text" : "password"}
                className="widefill notTooWide"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
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
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type={showPass ? "text" : "password"}
                className="widefill notTooWide"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div>
            <button className="primary narrow">Save Changes</button>
          </div>
          {info && (
            <p className="smallAndGray" style={{ margin: 0 }}>
              {info}
            </p>
          )}
          {err && (
            <p className="error-message" style={{ margin: 0 }}>
              {err}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
