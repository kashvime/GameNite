import type { SafeUserInfo, TaggedGameView } from "@gamenite/shared";
import NimGame from "./NimGame.tsx";
import GuessGame from "./GuessGame.tsx";
import ChessGame from "./ChessGame.tsx";
import { type JSX } from "react";
import useLoginContext from "../hooks/useLoginContext.ts";

interface GameDispatchProps {
  userPlayerIndex: number;
  players: SafeUserInfo[];
  gameId: string;
  view: TaggedGameView;
}

export default function GameDispatch({
  userPlayerIndex,
  gameId,
  players,
  view,
}: GameDispatchProps): JSX.Element {
  const { socket } = useLoginContext();
  const token = sessionStorage.getItem("token") ?? "";

  function makeMove(move: unknown) {
    socket.emit("gameMakeMove", { token, payload: { gameId, move } });
  }

  const childProps = { userPlayerIndex, players, makeMove };
  switch (view.type) {
    case "nim":
      return <NimGame {...{ ...childProps, view: view.view }} />;
    case "guess":
      return <GuessGame {...{ ...childProps, view: view.view }} />;
    case "chess":
      return <ChessGame {...{ ...childProps, view: view.view }} />;
  }
}
