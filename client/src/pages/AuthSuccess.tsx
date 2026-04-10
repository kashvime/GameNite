import { useEffect, type Dispatch, type SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import type { AuthContext } from "../contexts/LoginContext";
import type { SafeUserInfo } from "@gamenite/shared";
import { getUserById } from "../services/userService.ts";
import { clearStoredAuthToken, setStoredAuthToken } from "../util/authToken.ts";

interface Props {
  setAuth: Dispatch<SetStateAction<AuthContext | null>>;
}

export default function AuthSuccess({ setAuth }: Props) {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      navigate("/login");
      return;
    }

    setStoredAuthToken(token);

    let cancelled = false;
    void (async () => {
      let decoded: { username: string };
      try {
        decoded = jwtDecode<{ username: string }>(token);
      } catch {
        clearStoredAuthToken();
        navigate("/login");
        return;
      }

      const loaded = await getUserById(decoded.username);
      if (cancelled) return;
      if ("error" in loaded) {
        clearStoredAuthToken();
        navigate("/login");
        return;
      }

      setAuth({
        user: loaded,
        pass: token,
        reset: () => {
          setAuth(null);
          clearStoredAuthToken();
        },
        updateUser: (newUser: SafeUserInfo) => {
          setAuth((prev) => (prev ? { ...prev, user: newUser } : null));
        },
      });
      setTimeout(() => navigate("/"), 50);
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, setAuth]);

  return <div>Logging you in...</div>;
}
