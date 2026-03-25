import useLoginForm from "../hooks/useLoginForm.ts";
import "./Login.css";
import { useState } from "react";
import { type AuthContext } from "../contexts/LoginContext.ts";
import type { SafeUserInfo } from "@gamenite/shared";
import { useNavigate } from "react-router-dom";

interface LoginProps {
  setAuth: (s: AuthContext | null) => void;
}

export default function Login({ setAuth }: LoginProps) {
  const { mode, username, password, confirm, err, handleInputChange, handleSubmit, toggleMode } =
    useLoginForm(setAuth);

  const [showPassword, setShowPassword] = useState(false);
  const [ssoEmail, setSsoEmail] = useState("");
  const [ssoName, setSsoName] = useState("");
  const navigate = useNavigate();

  {
    /* SSO BUTTON FUNCTION */
  }
  const handleSSOLogin = async () => {
    try {
      if (!ssoEmail || !ssoName) {
        alert("Enter email and name");
        return;
      }

      const res = await fetch("/api/auth/sso-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: ssoEmail,
          name: ssoName,
        }),
      });

      const data = (await res.json()) as SafeUserInfo;

      setAuth({
        user: data,
        pass: "SSO_LOGIN",
        reset: () => setAuth(null),
      });

      navigate("/");
    } catch (err) {
      alert("SSO failed");
    }
  };

  return (
    <div className="container">
      <h1>GameNite</h1>

      <form className="login" onSubmit={(e) => handleSubmit(e)}>
        <h2>Log into GameNite</h2>

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

        <div className="intertext">or</div>

        {/* SSO INPUTS */}
        <input
          type="text"
          placeholder="SSO Email"
          className="widefill"
          onChange={(e) => setSsoEmail(e.target.value)}
        />

        <input
          type="text"
          placeholder="SSO Name"
          className="widefill"
          onChange={(e) => setSsoName(e.target.value)}
        />

        {/* SSO BUTTON */}
        <button type="button" className="widefill primary" onClick={handleSSOLogin}>
          Continue with SSO
        </button>

        <button
          className="narrowcenter secondary"
          onClick={(e) => {
            e.preventDefault();
            toggleMode();
          }}
        >
          {mode === "signup" ? "Use Existing Account" : "Create New Account"}
        </button>
      </form>

      <div className="smallAndGray" style={{ marginTop: "1rem" }}>
        GameNite stores passwords in cleartext; reusing passwords here is a catastrophically bad
        idea
      </div>
    </div>
  );
}
