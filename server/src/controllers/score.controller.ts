import { zMatchFilter, type MatchInfo, type GameKey, type League } from "@gamenite/shared";
import { type Request } from "express";
import { type RestAPI } from "../types.ts";
import { getMatchesByUserId, getLeaderboard, getUserRank } from "../services/score.service.ts";
import { getUserByUsername } from "../services/auth.service.ts";
import { getFriendIds } from "../services/friend.service.ts";
import { type RecordId } from "../models.ts";

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

/**
 * Returns the top users ranked by Elo rating for the given game type.
 * Query params: gameType (string, defaults to "chess"), limit? (number), friendsOnly? (boolean)
 */
export const getLeaderboardHandler: RestAPI = async (req, res) => {
  const rawGameType = typeof req.query.gameType === "string" ? req.query.gameType : "chess";
  const gameType = rawGameType as GameKey;
  const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 30;
  const friendsOnly = req.query.friendsOnly === "true";
  const requestUsername = typeof req.query.username === "string" ? req.query.username : undefined;

  const league = typeof req.query.league === "string" ? (req.query.league as League) : undefined;

  let userIds: RecordId[] | undefined;
  if (friendsOnly && requestUsername) {
    const auth = await getUserByUsername(requestUsername);
    if (auth) userIds = await getFriendIds(auth.userId);
  }

  res.send(await getLeaderboard(gameType, limit, userIds, league));
};

export const postMyRank: RestAPI<{ rank: number; rating: number } | null> = async (req, res) => {
  const jwtUser = getJwtUser(req);
  if (!jwtUser) {
    res.status(401).send({ error: "Unauthorized" });
    return;
  }

  const user = await getUserByUsername(jwtUser.username);
  if (!user) {
    res.status(403).send({ error: "User not found" });
    return;
  }

  const rawGameType = typeof req.query.gameType === "string" ? req.query.gameType : "chess";
  const gameType = rawGameType as GameKey;
  const friendsOnly = req.query.friendsOnly === "true";
  const league = typeof req.query.league === "string" ? (req.query.league as League) : undefined;

  let userIds: RecordId[] | undefined;
  if (friendsOnly) userIds = await getFriendIds(user.userId);

  res.send(await getUserRank(user.userId, gameType, userIds, league));
};
