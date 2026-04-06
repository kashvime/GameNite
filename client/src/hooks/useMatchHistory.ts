import type { ErrorMsg, MatchFilter, MatchInfo } from "@gamenite/shared";
import { useEffect, useState } from "react";
import { getMatchHistory } from "../services/matchService.ts";
import useLoginContext from "./useLoginContext";

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
  const { user, pass } = useLoginContext();
  const [matches, setMatches] = useState<MatchInfo[] | ErrorMsg | null>(null);

  useEffect(() => {
    const auth = { username: user.username, password: pass };
    getMatchHistory(auth, filter).then(setMatches);
  }, [user.username, pass, filter]);

  if (!matches) return { type: "loading" };
  if ("error" in matches) return { type: "error", message: matches.error };
  if (matches.length === 0) return { type: "empty" };

  return { type: "loaded", matches };
}
