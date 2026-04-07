import type { GameKey } from "@gamenite/shared";
import { type ChangeEvent, useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createGame } from "../services/gameService.ts";
import useLoginContext from "./useLoginContext";

export default function useNewGameForm() {
  const { user, pass } = useLoginContext();
  const [gameKey, setGameKey] = useState<GameKey | "">("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleInputChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setErr(null);
    setGameKey(e.target.value as GameKey | "");
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (gameKey === "") {
      setErr("Please select a game");
      return;
    }
    setErr(null);
    const auth = { username: user.username, password: pass };
    const game = await createGame(auth, gameKey, visibility);
    if ("error" in game) {
      setErr(game.error);
      return;
    }
    navigate(`/game/${game.gameId}`);
  };

  return { gameKey, visibility, setVisibility, err, handleInputChange, handleSubmit };
}
