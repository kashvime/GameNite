import { zMatchFilter, type MatchInfo } from "@gamenite/shared";
import { type Request } from "express";
import { type RestAPI } from "../types.ts";
import { getMatchesByUserId } from "../services/score.service.ts";
import { getUserByUsername } from "../services/auth.service.ts";

type JwtUser = { username: string };

function getJwtUser(req: Request): JwtUser | undefined {
  const u = (req as Request & { user?: JwtUser }).user;
  return u;
}

export const postMatches: RestAPI<MatchInfo[]> = async (req, res) => {
  const user = getJwtUser(req);
  if (!user) {
    res.status(401).send({ error: "Unauthorized" });
    return;
  }

  const body = req.body as { payload?: unknown };
  const filterInput = body?.payload ?? body;
  const parsed = zMatchFilter.safeParse(filterInput);
  if (!parsed.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const userRecord = await getUserByUsername(user.username);
  if (!userRecord) {
    res.status(403).send({ error: "User not found" });
    return;
  }

  res.send(await getMatchesByUserId(userRecord.userId, parsed.data));
};
