import type { ErrorMsg, GameInfo } from "@gamenite/shared";
import { useEffect, useState } from "react";
import { gameList } from "../services/gameService.ts";

const PAGE_SIZE = 10;

export default function useGameList(maxGames?: number): { message: string } | GameInfo[] {
  const [games, setGames] = useState<GameInfo[] | ErrorMsg | null>(null);

  useEffect(() => {
    gameList(maxGames).then(setGames);
  }, [maxGames]);

  if (!games) return { message: "Loading..." };
  if ("error" in games) return { message: `Error: ${games.error}` };
  if (games.length === 0) return { message: "No games found..." };
  return games;
}

export { PAGE_SIZE };
