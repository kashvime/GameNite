import { withAuth, zMatchFilter, type MatchInfo } from "@gamenite/shared";
import { type RestAPI } from "../types.ts";
import { checkAuth } from "../services/auth.service.ts";
import { getMatchesByUserId } from "../services/score.service.ts";

const zPostMatches = withAuth(zMatchFilter);

/**
 * Returns the match history for the authenticated user,
 * optionally filtered by game type, result, opponent username, or date range.
 * Body: { auth, payload: { gameType?, result?, opponentUsername?, dateRange? } }
 */
export const postMatches: RestAPI<MatchInfo[]> = async (req, res) => {
  const body = zPostMatches.safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }
  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  res.send(await getMatchesByUserId(user.userId, body.data.payload));
};
