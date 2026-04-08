/* eslint no-console: "off" */

import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./pages/Login.tsx";
import type { AuthContext } from "./contexts/LoginContext.ts";
import Layout from "./components/Layout.tsx";
import Home from "./pages/Home.tsx";
import ThreadList from "./pages/ThreadList.tsx";
import Profile from "./pages/Profile.tsx";
import { io } from "socket.io-client";
import type { GameSocket } from "./util/types.ts";
import LoggedInRoute from "./components/LoggedInRoute.tsx";
import NewGame from "./pages/NewGame.tsx";
import Game from "./pages/Game.tsx";
import GameList from "./pages/GameList.tsx";
import ThreadPage from "./pages/ThreadPage.tsx";
import { ErrorBoundary } from "react-error-boundary";
import fallback from "./fallback.tsx";
import NewThread from "./pages/NewThread.tsx";
import TimeContextKeeper from "./components/UpdatingTimeContext.tsx";
import Friends from "./pages/Friends.tsx";
import MatchHistory from "./pages/MatchHistory.tsx";
import Leaderboard from "./pages/Leaderboard.tsx";
import AuthSuccess from "./pages/AuthSuccess";
import { jwtDecode } from "jwt-decode";
import type { SafeUserInfo } from "@gamenite/shared";
import { clearStoredAuthToken, getStoredAuthToken } from "./util/authToken.ts";

/** If `true`, all incoming socket messages will be logged */
const DEBUG_SOCKETS = false;

/**
 * Websocket connection for the app. It would be natural to define this in a
 * useEffect hook, but the React docts advise against this.
 * https://react.dev/learn/you-might-not-need-an-effect#initializing-the-application
 * */
let socket: GameSocket | null = null;
if (typeof window !== "undefined") {
  socket = io();
  if (DEBUG_SOCKETS) {
    socket.onAny((tag, payload) => {
      console.log(`from socket got ${tag}(${JSON.stringify(payload)})`);
    });
  }
}

function NoSuchRoute() {
  const { pathname } = useLocation();
  return `No page found for route '${pathname}'`;
}

export default function App() {
  const [auth, setAuth] = useState<AuthContext | null>(null);
  const updateUser = (newUser: SafeUserInfo) => {
    setAuth((prev) => (prev ? { ...prev, user: newUser } : null));
  };

  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = getStoredAuthToken();

    if (token) {
      try {
        const decoded = jwtDecode<SafeUserInfo>(token);

        // Fetch full user data to get avatarUrl and other fields
        fetch(`http://localhost:8000/api/user/${encodeURIComponent(decoded.username)}`)
          .then((res) => res.json())
          .then((user: SafeUserInfo) => {
            queueMicrotask(() => {
              setAuth({
                user,
                pass: token,
                reset: () => {
                  setAuth(null);
                  clearStoredAuthToken();
                },
                updateUser: (newUser) => {
                  setAuth((prev) => (prev ? { ...prev, user: newUser } : null));
                },
              });
            });
          });
      } catch {
        clearStoredAuthToken();
      }
    }
    queueMicrotask(() => setLoading(false));
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }
  return (
    socket && (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login setAuth={(auth) => setAuth(auth)} />} />
          <Route path="/auth-success" element={<AuthSuccess setAuth={setAuth} />} />{" "}
          <Route
            element={
              <LoggedInRoute auth={auth} socket={socket} updateUser={updateUser}>
                <TimeContextKeeper updateFrequency={20 * 1000}>
                  <ErrorBoundary fallbackRender={fallback}>
                    <Layout />
                  </ErrorBoundary>
                </TimeContextKeeper>
              </LoggedInRoute>
            }
          >
            <Route path="/" element={<Home />} />
            <Route path="/forum" element={<ThreadList />} />
            <Route path="/forum/post/new" element={<NewThread />} />
            <Route path="/forum/post/:threadId" element={<ThreadPage />} />
            <Route path="/games" element={<GameList />} />
            <Route path="/game/new" element={<NewGame />} />
            <Route path="/game/:gameId" element={<Game />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/matches" element={<MatchHistory />} />
            <Route path="/*" element={<NoSuchRoute />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    )
  );
}
