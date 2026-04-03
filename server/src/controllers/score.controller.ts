import { withAuth, zMatchFilter, type GameKey, type MatchInfo } from "@gamenite/shared";
import { type RestAPI } from "../types.ts";
import { checkAuth, getUserByUsername } from "../services/auth.service.ts";
import { getMatchesByUserId, getLeaderboard, getUserRank } from "../services/score.service.ts";
import { zUserAuth } from "@gamenite/shared";
import { getFriendIds } from "../services/friend.service.ts";
import type { RecordId } from "../models.ts";

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

/**
 * Returns the top users ranked by win count.
 * Query params: gameType? (string), limit? (number)
 */
export const getLeaderboardHandler: RestAPI = async (req, res) => {
  const gameType = typeof req.query.gameType === "string" ? req.query.gameType : undefined;
  const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 30;
  const from = typeof req.query.from === "string" ? new Date(req.query.from) : undefined;
  const to = typeof req.query.to === "string" ? new Date(req.query.to) : undefined;
  const dateRange = from && to ? { from, to } : undefined;
  const friendsOnly = req.query.friendsOnly === "true";
  const requestUsername = typeof req.query.username === "string" ? req.query.username : undefined;

  let userIds: RecordId[] | undefined;
  if (friendsOnly && requestUsername) {
    const auth = await getUserByUsername(requestUsername);
    if (auth) userIds = await getFriendIds(auth.userId);
  }

  res.send(await getLeaderboard(gameType as GameKey | undefined, dateRange, limit, userIds));
};

export const postMyRank: RestAPI<{ rank: number; wins: number } | null> = async (req, res) => {
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
  const gameType = typeof req.query.gameType === "string" ? req.query.gameType : undefined;
  const from = typeof req.query.from === "string" ? new Date(req.query.from) : undefined;
  const to = typeof req.query.to === "string" ? new Date(req.query.to) : undefined;
  const dateRange = from && to ? { from, to } : undefined;
  const friendsOnly = req.query.friendsOnly === "true";

  let userIds: RecordId[] | undefined;
  if (friendsOnly) userIds = await getFriendIds(user.userId);

  res.send(await getUserRank(user.userId, gameType as GameKey | undefined, dateRange, userIds));
};
