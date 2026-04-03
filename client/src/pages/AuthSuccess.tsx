import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import type { AuthContext } from "../contexts/LoginContext";
import type { SafeUserInfo } from "@gamenite/shared";

interface Props {
  setAuth: (auth: AuthContext | null) => void;
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

    // ✅ save FIRST
    localStorage.setItem("token", token);

    // ✅ decode AFTER
    const user = jwtDecode<SafeUserInfo>(token);

    setAuth({
      user,
      pass: token,
      reset: () => {
        setAuth(null);
        localStorage.removeItem("token");
      },
    });

    // ✅ navigate AFTER everything is set
    setTimeout(() => {
      navigate("/");
    }, 50); // tiny delay ensures storage is ready
  }, [navigate, setAuth]);

  return <div>Logging you in...</div>;
}
