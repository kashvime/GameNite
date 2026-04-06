import useLoginForm from "../hooks/useLoginForm.ts";
import "./Login.css";
import { useState } from "react";
import { type AuthContext } from "../contexts/LoginContext.ts";

interface LoginProps {
  setAuth: (s: AuthContext | null) => void;
}

export default function Login({ setAuth }: LoginProps) {
  const { mode, username, password, confirm, err, handleInputChange, handleSubmit, toggleMode } =
    useLoginForm(setAuth);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="login-page">
      {/* Left panel */}
      <div className="login-left">
        <div className="login-logo">
          Game<span>Nite</span>
        </div>
        <div className="login-tagline">Compete. Connect. Conquer.</div>
        <div className="login-features">
          <div className="login-feature">
            <div className="login-feature-icon">♟</div>
            <span>Play Chess and other games against friends</span>
          </div>
          <div className="login-feature">
            <div className="login-feature-icon">🏆</div>
            <span>Climb the leaderboard and earn your league</span>
          </div>
          <div className="login-feature">
            <div className="login-feature-icon">👥</div>
            <span>Build your crew and track match history</span>
          </div>
          <div className="login-feature">
            <div className="login-feature-icon">📈</div>
            <span>Watch your rating grow with every win</span>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="login-right">
        <div className="login-form-wrapper">
          <div className="login-form-title">
            {mode === "signup" ? "Create an account" : "Welcome back!"}
          </div>
          <div className="login-form-subtitle">
            {mode === "signup"
              ? "Join GameNite and start competing today."
              : "Sign in to continue to GameNite."}
          </div>

          <form className="login" onSubmit={(e) => handleSubmit(e)}>
            <input
              type="text"
              value={username}
              onChange={(event) => handleInputChange(event, "username")}
              placeholder="Username"
              aria-label="Username"
              className="widefill"
            />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => handleInputChange(event, "password")}
              placeholder="Password"
              aria-label="Password"
              className="widefill"
            />
            {mode === "signup" && (
              <input
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(event) => handleInputChange(event, "confirm")}
                placeholder="Confirm Password"
                aria-label="Confirm Password"
                className="widefill"
              />
            )}
            <div className="labeled-section">
              <input
                type="checkbox"
                id="showPasswordToggle"
                checked={showPassword}
                onChange={() => setShowPassword((prev) => !prev)}
              />
              <label htmlFor="showPasswordToggle">Show Password</label>
            </div>
            {err && <p className="error-message centered">{err}</p>}
            <button type="submit" className="widefill primary">
              {mode === "signup" ? "Sign Up" : "Log In"}
            </button>

            <div className="login-divider">or</div>

            <a href="http://localhost:8000/auth/google" style={{ textDecoration: "none" }}>
              <button type="button" className="google-btn">
                <span className="google-icon">G</span>
                Continue with Google
              </button>
            </a>

            <div className="login-toggle">
              {mode === "signup" ? "Already have an account? " : "Don't have an account? "}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  toggleMode();
                }}
              >
                {mode === "signup" ? "Log in" : "Sign up"}
              </button>
            </div>
          </form>

          <div className="login-disclaimer">
            GameNite stores passwords in cleartext — please don't reuse passwords here.
          </div>
        </div>
      </div>
    </div>
  );
}
