import type { AIDifficulty, GameKey } from "@gamenite/shared";
import { type ChangeEvent, useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createGame } from "../services/gameService.ts";
import useLoginContext from "./useLoginContext";

export default function useNewGameForm() {
  const { user, pass } = useLoginContext();
  const [gameKey, setGameKey] = useState<GameKey | "">("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [gameMode, setGameMode] = useState<"human" | "ai">("human");
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>("medium");
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleInputChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setErr(null);
    const newKey = e.target.value as GameKey | "";
    setGameKey(newKey);
    if (newKey !== "chess") setGameMode("human"); // reset if not chess
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (gameKey === "") {
      setErr("Please select a game");
      return;
    }
    setErr(null);
    const auth = { username: user.username, password: pass };
    const game = await createGame(
      auth,
      gameKey,
      visibility,
      gameMode,
      gameMode === "ai" ? aiDifficulty : undefined,
    );
    if ("error" in game) {
      setErr(game.error);
      return;
    }
    navigate(`/game/${game.gameId}`);
  };

  return {
    gameKey,
    visibility,
    setVisibility,
    gameMode,
    setGameMode,
    aiDifficulty,
    setAiDifficulty,
    err,
    handleInputChange,
    handleSubmit,
  };
}
