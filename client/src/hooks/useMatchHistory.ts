import type { ErrorMsg, MatchFilter, MatchInfo, UserAuth } from "@gamenite/shared";
import { useEffect, useState } from "react";
import { getMatchHistory } from "../services/matchService.ts";

/**
 * Custom hook to get the match history for the authenticated user.
 * @param auth - The authenticated user's credentials
 * @returns A message to display to the user (Loading... or an error message), or a list of match records
 */
export default function useMatchHistory(
  auth: UserAuth,
  filter?: MatchFilter,
): { message: string } | MatchInfo[] {
  const [matches, setMatches] = useState<MatchInfo[] | ErrorMsg | null>(null);
  useEffect(() => {
    getMatchHistory(auth, filter).then(setMatches);
  }, [auth, filter]);

  if (!matches) return { message: "Loading..." };
  if ("error" in matches) return { message: `Error: ${matches.error}` };
  if (matches.length === 0) return { message: "No matches played yet." };
  return matches;
}
