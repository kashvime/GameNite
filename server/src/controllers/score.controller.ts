import { zUserAuth } from "@gamenite/shared";
import { type ScoreRecord } from "../models.ts";
import { type RestAPI } from "../types.ts";
import { checkAuth } from "../services/auth.service.ts";
import { getMatchesByUserId } from "../services/score.service.ts";

/**
 * Returns the match history for the authenticated user.
 * Body: { username, password }
 */
export const postMatches: RestAPI<ScoreRecord[]> = async (req, res) => {
  const body = zUserAuth.safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  res.send(await getMatchesByUserId(user.userId));
};
