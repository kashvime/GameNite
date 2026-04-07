import { useEffect, useRef, useState } from "react";
import type { GamePlayInfo, SafeUserInfo, TaggedGameView } from "@gamenite/shared";
import useLoginContext from "./useLoginContext.ts";

/**
 * Custom hook to manage socket connection for a game
 * @throws if outside a LoginContext
 * @returns an object containing:
 * - `hasWatched`: Boolean that goes from false to true once the server has
 *   acknowledged the socket connection request
 * - `players`: The current list of game players.
 * - `userPlayerIndex`: The index of the current user in the `players` array,
 *   or null if the user is not a player
 * - `view`: The current game view for this user
 * - `joinGame`: Joins the game (if not started)
 * - `startGame`: Start the game (once joined)
 */
export default function useSocketsForGame(gameId: string, initialPlayers: SafeUserInfo[]) {
  const { user, socket } = useLoginContext();
  const token = sessionStorage.getItem("token") ?? "";
  const [view, setView] = useState<null | TaggedGameView>(null);
  const [hasWatched, setHasWatched] = useState<boolean>(false);
  const [players, setPlayers] = useState<SafeUserInfo[]>(initialPlayers);
  const userPlayerIndex = players.findIndex(({ username }) => username === user.username);
  const userPlayerIndexRef = useRef(userPlayerIndex);
  userPlayerIndexRef.current = userPlayerIndex;

  useEffect(() => {
    const handleWatched = (game: GamePlayInfo) => {
      if (game.gameId !== gameId) return;
      socket.off("gameWatched", handleWatched);
      setHasWatched(true);
      setPlayers(game.players);
      setView(game.view);
    };

    const handlePlayersUpdated = ({ gameId: id, players: newPlayers }: { gameId: string; players: SafeUserInfo[] }) => {
      if (id !== gameId) return;
      setPlayers(newPlayers);
    };

    const handleStateUpdated = (update: TaggedGameView & { forPlayer: boolean; gameId: string }) => {
      if (update.gameId !== gameId) return;
      if (userPlayerIndexRef.current >= 0 && !update.forPlayer) return;
      setView(update);
    };

    socket.on("gameWatched", handleWatched);
    socket.on("gamePlayersUpdated", handlePlayersUpdated);
    socket.on("gameStateUpdated", handleStateUpdated);
    socket.emit("gameWatch", { token, payload: gameId });

    return () => {
      socket.off("gameWatched", handleWatched);
      socket.off("gamePlayersUpdated", handlePlayersUpdated);
      socket.off("gameStateUpdated", handleStateUpdated);
    };
  }, [gameId, socket, token]);

  function joinGame() {
    socket.emit("gameJoinAsPlayer", { token, payload: gameId });
  }

  function startGame() {
    socket.emit("gameStart", { token, payload: gameId });
  }

  return {
    hasWatched,
    players,
    userPlayerIndex,

    view,
    joinGame,
    startGame,
  };
}
