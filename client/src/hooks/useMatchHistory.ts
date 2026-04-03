import type { ErrorMsg, MatchFilter, MatchInfo } from "@gamenite/shared";
import { useEffect, useState } from "react";
import { getMatchHistory } from "../services/matchService.ts";

type MatchHistoryState =
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "empty" }
  | { type: "loaded"; matches: MatchInfo[] };

/**
 * Custom hook to get the match history for the authenticated user.
 * @returns A message to display to the user (Loading... or an error message), or a list of match records
 */
export default function useMatchHistory(filter?: MatchFilter): MatchHistoryState {
  const [matches, setMatches] = useState<MatchInfo[] | ErrorMsg | null>(null);

  useEffect(() => {
    getMatchHistory(filter).then(setMatches);
  }, [filter]);

  if (!matches) return { type: "loading" };
  if ("error" in matches) return { type: "error", message: matches.error };
  if (matches.length === 0) return { type: "empty" };

  return { type: "loaded", matches };
}
