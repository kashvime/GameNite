import type { ErrorMsg, UserAuth } from "@gamenite/shared";
import { useEffect, useState } from "react";
import type { ScoreRecord } from "../../../server/src/models.ts";
import { getMatchHistory } from "../services/matchService.ts";

/**
 * Custom hook to get the match history for the authenticated user.
 * @param auth - The authenticated user's credentials
 * @returns A message to display to the user (Loading... or an error message), or a list of match records
 */
export default function useMatchHistory(auth: UserAuth): { message: string } | ScoreRecord[] {
  const [matches, setMatches] = useState<ScoreRecord[] | ErrorMsg | null>(null);

  useEffect(() => {
    getMatchHistory(auth).then(setMatches);
  }, [auth]);

  if (!matches) return { message: "Loading..." };
  if ("error" in matches) return { message: `Error: ${matches.error}` };
  if (matches.length === 0) return { message: "No matches played yet." };
  return matches;
}
