import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { GamePlayInfo, SafeUserInfo, TaggedGameView } from "@gamenite/shared";
import useLoginContext from "./useLoginContext.ts";
import { viewerSeat } from "../util/viewerSeat.ts";

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
  const { user, socket, pass: token } = useLoginContext();
  const [view, setView] = useState<null | TaggedGameView>(null);
  const [hasWatched, setHasWatched] = useState<boolean>(false);
  const [players, setPlayers] = useState<SafeUserInfo[]>(initialPlayers);
  const userPlayerIndex = viewerSeat(players, user);
  const userPlayerIndexRef = useRef(viewerSeat(initialPlayers, user));
  const watchSeqRef = useRef(0);

  useLayoutEffect(() => {
    userPlayerIndexRef.current = userPlayerIndex;
  }, [userPlayerIndex]);

  useEffect(() => {
    const myWatchId = ++watchSeqRef.current;
    const handleWatched = (game: GamePlayInfo) => {
      if (game.gameId !== gameId) return;
      if (game.watchId !== undefined && game.watchId !== myWatchId) return;
      socket.off("gameWatched", handleWatched);
      setHasWatched(true);
      setPlayers(game.players);
      userPlayerIndexRef.current = game.yourPlayerIndex;
      setView(game.view);
    };

    const handlePlayersUpdated = (newPlayers: SafeUserInfo[]) => {
      setPlayers(newPlayers);
      userPlayerIndexRef.current = viewerSeat(newPlayers, user);
    };

    const handleStateUpdated = (payload: TaggedGameView & { forPlayer: boolean }) => {
      if (!payload) return;
      // Personalized views must never be replaced by the broadcast watcher payload (same socket
      // is in the game room and receives both). Spectators only consume watcher payloads.
      if (payload.forPlayer) {
        setView(payload);
        return;
      }
      if (userPlayerIndexRef.current < 0) {
        setView(payload);
      }
    };

    socket.on("gameWatched", handleWatched);
    socket.on("gamePlayersUpdated", handlePlayersUpdated);
    socket.on("gameStateUpdated", handleStateUpdated);
    socket.emit("gameWatch", { token, payload: { gameId, watchId: myWatchId } });

    return () => {
      socket.off("gameWatched", handleWatched);
      socket.off("gamePlayersUpdated", handlePlayersUpdated);
      socket.off("gameStateUpdated", handleStateUpdated);
    };
  }, [gameId, socket, token, user.userId, user.username]);

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
